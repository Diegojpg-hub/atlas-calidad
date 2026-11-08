import copy
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest import mock

import jws_vex


IMAGE_ID = "sha256:" + "a" * 64
REFERENCE = "atlas-backend:test"
FILES = [
    ("app/src/auth.js", b"verify(token, secret)", tarfile.REGTYPE, "", 0o644),
    ("app/node_modules/jws/package.json", b'{"version":"3.2.2"}', tarfile.REGTYPE, "", 0o644),
    ("usr/bin/node", b"", tarfile.SYMTYPE, "node24", 0o777),
]


def archive_for(entries, mtime=0):
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode="w") as archive:
        for name, content, kind, linkname, mode in entries:
            info = tarfile.TarInfo(name)
            info.type = kind
            info.linkname = linkname
            info.mode = mode
            info.mtime = mtime
            info.size = len(content) if info.isfile() else 0
            archive.addfile(info, io.BytesIO(content) if info.isfile() else None)
    stream.seek(0)
    return stream


def inspection():
    return [
        {
            "Id": IMAGE_ID,
            "RepoTags": [REFERENCE],
            "Os": "linux",
            "Architecture": "amd64",
            "Config": copy.deepcopy(jws_vex.EXPECTED_CONFIG),
        }
    ]


class FilesystemTests(unittest.TestCase):
    def test_hash_is_independent_of_tar_order_and_timestamps(self):
        first = jws_vex.filesystem_sha256(archive_for(FILES))
        second = jws_vex.filesystem_sha256(archive_for(reversed(FILES), mtime=12345))
        self.assertEqual(first, second)

    def test_hash_changes_with_code_packages_links_and_permissions(self):
        original = jws_vex.filesystem_sha256(archive_for(FILES))
        variants = [
            [("app/src/auth.js", b"createVerify(token)", tarfile.REGTYPE, "", 0o644), *FILES[1:]],
            [FILES[0], ("app/node_modules/jws/package.json", b'{"version":"3.2.3"}', tarfile.REGTYPE, "", 0o644), FILES[2]],
            [*FILES, ("app/src/other.js", b"extra", tarfile.REGTYPE, "", 0o644)],
            [FILES[0], FILES[1], ("usr/bin/node", b"", tarfile.SYMTYPE, "other", 0o777)],
            [FILES[0], FILES[1], ("usr/bin/node", b"", tarfile.SYMTYPE, "node24", 0o755)],
            FILES[:-1],
        ]
        for entries in variants:
            with self.subTest(entries=entries):
                self.assertNotEqual(original, jws_vex.filesystem_sha256(archive_for(entries)))

    def test_rejects_empty_unsafe_or_duplicate_paths(self):
        for entries in [
            [],
            [("../outside", b"x", tarfile.REGTYPE, "", 0o644)],
            [("/outside", b"x", tarfile.REGTYPE, "", 0o644)],
            [FILES[0], FILES[0]],
        ]:
            with self.subTest(entries=entries):
                with self.assertRaises(jws_vex.ReviewRequired):
                    jws_vex.filesystem_sha256(archive_for(entries))

    def test_failed_cli_exports_hashes_but_no_statement_or_file_contents(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "inspect.json").write_text(json.dumps(inspection()), encoding="utf-8")
            (root / "compose.yml").write_text("services: {}", encoding="utf-8")
            manifest = root / "manifest.json"
            result = subprocess.run(
                [
                    sys.executable,
                    str(Path(jws_vex.__file__)),
                    "--inspect",
                    str(root / "inspect.json"),
                    "--reference",
                    REFERENCE,
                    "--container-image-id",
                    IMAGE_ID,
                    "--compose",
                    str(root / "compose.yml"),
                    "--manifest-output",
                    str(manifest),
                ],
                input=archive_for(FILES).getvalue(),
                capture_output=True,
                check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(result.stdout, b"")
            self.assertIn(b"Cambi", result.stderr)
            entries = json.loads(manifest.read_text(encoding="utf-8"))
            self.assertEqual(len(entries), len(FILES))
            self.assertNotIn("verify(token, secret)", manifest.read_text(encoding="utf-8"))


class StatementTests(unittest.TestCase):
    def setUp(self):
        self.filesystem = jws_vex.filesystem_sha256(archive_for(FILES))
        self.compose = "reviewed-compose"
        self.patches = [
            mock.patch.object(jws_vex, "APPROVED_FILESYSTEM_SHA256", {self.filesystem}),
            mock.patch.object(jws_vex, "APPROVED_COMPOSE_SHA256", self.compose),
        ]
        for patch in self.patches:
            patch.start()
            self.addCleanup(patch.stop)

    def make_statement(self, image=None, reference=REFERENCE, image_id=IMAGE_ID, filesystem=None, compose=None):
        return jws_vex.statement_for_image(
            inspection() if image is None else image,
            reference,
            image_id,
            self.filesystem if filesystem is None else filesystem,
            self.compose if compose is None else compose,
        )

    def test_only_the_reviewed_jws_cve_and_image_are_declared(self):
        document = self.make_statement()
        self.assertEqual(len(document["statements"]), 1)
        statement = document["statements"][0]
        self.assertEqual(statement["vulnerability"]["name"], "CVE-2025-65945")
        self.assertEqual(statement["status"], "not_affected")
        self.assertEqual(statement["justification"], "vulnerable_code_not_in_execute_path")
        self.assertEqual(statement["products"], [{"@id": "pkg:npm/jws@3.2.2"}])
        self.assertIn(IMAGE_ID, statement["impact_statement"])

    def test_rejects_changes_to_image_and_deployment(self):
        for arguments in [
            {"filesystem": "changed"},
            {"compose": "changed"},
            {"image_id": "sha256:" + "b" * 64},
            {"reference": "other:latest"},
            {"image": []},
        ]:
            with self.subTest(arguments=arguments):
                with self.assertRaises(jws_vex.ReviewRequired):
                    self.make_statement(**arguments)

    def test_rejects_runtime_or_platform_changes(self):
        mutations = [
            ("Os", "windows"),
            ("Architecture", "arm64"),
            ("RepoTags", ["atlas-backend:other"]),
            ("Id", "not-a-digest"),
        ]
        for key, value in mutations:
            image = inspection()
            image[0][key] = value
            with self.subTest(key=key):
                with self.assertRaises(jws_vex.ReviewRequired):
                    self.make_statement(image=image)

        for key, value in [
            ("Entrypoint", ["node"]),
            ("Cmd", ["node", "other.js"]),
            ("WorkingDir", "/other"),
            ("User", "root"),
            ("Env", [*jws_vex.EXPECTED_CONFIG["Env"], "NODE_OPTIONS=--require=other"]),
            ("Volumes", {"/app": {}}),
            ("Healthcheck", {"Test": ["CMD", "node", "other.js"]}),
        ]:
            image = inspection()
            image[0]["Config"][key] = value
            with self.subTest(key=key):
                with self.assertRaises(jws_vex.ReviewRequired):
                    self.make_statement(image=image)


if __name__ == "__main__":
    unittest.main()
