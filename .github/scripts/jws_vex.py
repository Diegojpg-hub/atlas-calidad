#!/usr/bin/env python3
"""Generate the jws applicability statement only for the reviewed image."""

import argparse
import datetime
import hashlib
import json
import posixpath
import re
import sys
import tarfile
import uuid


APPROVED_FILESYSTEM_SHA256 = frozenset(
    {
        "58e7ceb0375a72e619dd0a28e39b3f78fedd0a7c7bac10e0ab99bd394ef095ba",
        "6dcc487516533770a2c8a9b24770f3bb78d236d1fcd9ea536a54409e8dc5e468",
    }
)
APPROVED_COMPOSE_SHA256 = "34784286affbd1a0b47ffedd59b6d44b81546c2a3eaf677f76e5201a6fdaf8d6"
EXPECTED_CONFIG = {
    "User": "node",
    "WorkingDir": "/app",
    "Entrypoint": ["docker-entrypoint.sh"],
    "Cmd": ["node", "src/app.js"],
    "Env": [
        "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        "NODE_VERSION=24.22.2",
        "YARN_VERSION=1.22.22",
    ],
    "Volumes": None,
    "Healthcheck": None,
}


class ReviewRequired(Exception):
    pass


def filesystem_entries(stream):
    entries = []
    seen = set()
    with tarfile.open(fileobj=stream, mode="r|") as archive:
        for member in archive:
            parts = member.name.split("/")
            name = posixpath.normpath(member.name)
            if member.name.startswith("/") or ".." in parts or name in ("", "."):
                raise ReviewRequired(f"Ruta inesperada en la imagen: {member.name!r}")
            if name in seen:
                raise ReviewRequired(f"Ruta duplicada en la imagen: {name!r}")
            seen.add(name)
            if not (
                member.isfile()
                or member.isdir()
                or member.issym()
                or member.islnk()
                or member.ischr()
                or member.isblk()
                or member.isfifo()
            ):
                raise ReviewRequired(f"Tipo de archivo inesperado: {name!r}")

            content_hash = None
            if member.isfile():
                content = archive.extractfile(member)
                if content is None:
                    raise ReviewRequired(f"No se pudo leer el archivo: {name!r}")
                digest = hashlib.sha256()
                for chunk in iter(lambda: content.read(1024 * 1024), b""):
                    digest.update(chunk)
                content_hash = digest.hexdigest()

            entries.append(
                [
                    name,
                    member.type.decode("ascii"),
                    member.mode,
                    member.uid,
                    member.gid,
                    member.size,
                    member.linkname,
                    member.devmajor,
                    member.devminor,
                    content_hash,
                ]
            )

    if not entries:
        raise ReviewRequired("La imagen exportada está vacía.")
    entries.sort(key=lambda entry: entry[0])
    return entries


def entries_sha256(entries):
    encoded = json.dumps(entries, ensure_ascii=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def filesystem_sha256(stream):
    return entries_sha256(filesystem_entries(stream))


def statement_for_image(inspection, reference, container_image_id, filesystem_hash, compose_hash):
    if filesystem_hash not in APPROVED_FILESYSTEM_SHA256:
        raise ReviewRequired(
            "Cambió el contenido de la imagen; revisar el uso de jws antes de "
            f"actualizar la huella aprobada ({filesystem_hash})."
        )
    if compose_hash != APPROVED_COMPOSE_SHA256:
        raise ReviewRequired(
            "Cambió docker-compose.yml; revisar cómo se ejecuta Atlas antes de "
            f"actualizar la huella aprobada ({compose_hash})."
        )
    if not isinstance(inspection, list) or len(inspection) != 1:
        raise ReviewRequired("La inspección debe describir una sola imagen.")
    image = inspection[0]
    if not isinstance(image, dict):
        raise ReviewRequired("La inspección de la imagen no es válida.")
    image_id = image.get("Id")
    if not isinstance(image_id, str) or not re.fullmatch(r"sha256:[0-9a-f]{64}", image_id):
        raise ReviewRequired("La imagen no tiene un identificador SHA-256 válido.")
    if image_id != container_image_id:
        raise ReviewRequired("La imagen exportada no coincide con la imagen inspeccionada.")
    if not re.fullmatch(r"atlas-backend:[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}", reference):
        raise ReviewRequired("La referencia no corresponde a atlas-backend.")
    tags = image.get("RepoTags")
    if not isinstance(tags, list) or reference not in tags:
        raise ReviewRequired("La etiqueta no corresponde a la imagen inspeccionada.")
    if image.get("Os") != "linux" or image.get("Architecture") != "amd64":
        raise ReviewRequired("Cambió la plataforma de la imagen.")

    config = image.get("Config")
    if not isinstance(config, dict):
        raise ReviewRequired("Falta la configuración de ejecución de la imagen.")
    for key, expected in EXPECTED_CONFIG.items():
        if config.get(key) != expected:
            raise ReviewRequired(f"Cambió la configuración de ejecución: {key}.")

    document_id = uuid.uuid5(uuid.NAMESPACE_URL, f"{image_id}#CVE-2025-65945")
    return {
        "@context": "https://openvex.dev/ns/v0.2.0",
        "@id": f"urn:uuid:{document_id}",
        "author": "Atlas CI",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "version": 1,
        "statements": [
            {
                "vulnerability": {"name": "CVE-2025-65945"},
                "products": [{"@id": "pkg:npm/jws@3.2.2"}],
                "status": "not_affected",
                "justification": "vulnerable_code_not_in_execute_path",
                "impact_statement": (
                    f"Evaluación válida solo para la imagen {image_id}. "
                    "La imagen revisada usa jsonwebtoken y jws.verify con "
                    "JWT_SECRET de configuración; no usa jws.createVerify para "
                    "buscar secretos a partir de datos del token. "
                    "https://github.com/advisories/GHSA-869p-cjfg-cm3x"
                ),
            }
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inspect", required=True, help="Resultado de docker image inspect")
    parser.add_argument("--reference", required=True, help="Etiqueta analizada por Trivy")
    parser.add_argument("--container-image-id", required=True, help="Imagen del contenedor exportado")
    parser.add_argument("--compose", required=True, help="Archivo docker-compose.yml revisado")
    parser.add_argument("--manifest-output", help="Guardar rutas y huellas para diagnóstico")
    args = parser.parse_args()

    try:
        with open(args.inspect, encoding="utf-8") as file:
            inspection = json.load(file)
        with open(args.compose, "rb") as file:
            compose_hash = hashlib.sha256(file.read()).hexdigest()
        entries = filesystem_entries(sys.stdin.buffer)
        if args.manifest_output:
            with open(args.manifest_output, "w", encoding="utf-8") as file:
                json.dump(entries, file, ensure_ascii=True, separators=(",", ":"))
        filesystem_hash = entries_sha256(entries)
        document = statement_for_image(
            inspection, args.reference, args.container_image_id, filesystem_hash, compose_hash
        )
    except (EOFError, OSError, ValueError, tarfile.TarError, ReviewRequired) as error:
        print(f"No se puede aplicar la evaluación de jws: {error}", file=sys.stderr)
        return 1

    json.dump(document, sys.stdout, ensure_ascii=False, indent=2)
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
