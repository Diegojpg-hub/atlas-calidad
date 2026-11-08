"use strict";

const forwarded = require("forwarded");
const ipaddr = require("ipaddr.js");
const { Address4, Address6 } = require("proxy-addr");

const ipv4Ranges = ipaddr.IPv4.prototype.SpecialRanges;
const ipv6Ranges = ipaddr.IPv6.prototype.SpecialRanges;
const subnetStrings = (entries) =>
  entries.map(([address, prefix]) => `${address.toString()}/${prefix}`);
const ranges = {
  linklocal: subnetStrings([...ipv4Ranges.linkLocal, ipv6Ranges.linkLocal]),
  loopback: subnetStrings([...ipv4Ranges.loopback, ipv6Ranges.loopback]),
  uniquelocal: subnetStrings([...ipv4Ranges.private, ipv6Ranges.uniqueLocal]),
};

function parseSubnet(notation) {
  const slash = notation.lastIndexOf("/");
  const address = slash < 0 ? notation : notation.slice(0, slash);
  if (!ipaddr.isValid(address)) {
    throw new TypeError(`invalid IP address: ${address}`);
  }

  let parsed = ipaddr.parse(address);
  if (slash < 0 && parsed.kind() === "ipv6" && parsed.isIPv4MappedAddress()) {
    parsed = parsed.toIPv4Address();
  }

  const kind = parsed.kind();
  const max = kind === "ipv4" ? 32 : 128;
  const suffix = slash < 0 ? null : notation.slice(slash + 1);
  let prefix = null;
  if (suffix === null) {
    prefix = max;
  } else if (/^[0-9]+$/.test(suffix)) {
    prefix = Number(suffix);
  } else if (kind === "ipv4" && ipaddr.isValid(suffix)) {
    const mask = ipaddr.parse(suffix);
    if (mask.kind() === "ipv4") prefix = mask.prefixLengthFromSubnetMask();
  }

  if (prefix === null || prefix <= 0 || prefix > max) {
    throw new TypeError(`invalid range on address: ${notation}`);
  }

  const isMapped = kind === "ipv6" && parsed.isIPv4MappedAddress();
  const Constructor = kind === "ipv4" ? Address4 : Address6;
  return {
    kind,
    isMapped,
    prefix,
    network: new Constructor(`${parsed.toString()}/${prefix}`),
  };
}

function compile(value) {
  if (!value) throw new TypeError("argument is required");
  if (typeof value !== "string" && !Array.isArray(value)) {
    throw new TypeError("unsupported trust argument");
  }

  const inputs = typeof value === "string" ? [value] : value;
  const subnets = [];
  for (const entry of inputs) {
    const expanded = Object.prototype.hasOwnProperty.call(ranges, entry)
      ? ranges[entry]
      : [entry];
    for (const notation of expanded) subnets.push(parseSubnet(notation));
  }

  if (!subnets.length) return () => false;

  return (address) => {
    if (!ipaddr.isValid(address)) return false;
    let parsed = ipaddr.parse(address);
    if (parsed.kind() === "ipv6" && parsed.isIPv4MappedAddress()) {
      parsed = parsed.toIPv4Address();
    }

    return subnets.some((subnet) => {
      let candidate = parsed;
      if (candidate.kind() !== subnet.kind) {
        if (candidate.kind() !== "ipv4" || !subnet.isMapped || subnet.prefix < 96) {
          return false;
        }
        candidate = candidate.toIPv4MappedAddress();
      } else if (subnet.kind === "ipv6" && subnet.isMapped) {
        return false;
      }

      const Constructor = subnet.kind === "ipv4" ? Address4 : Address6;
      return new Constructor(candidate.toString()).isHostInSubnet(subnet.network);
    });
  };
}

function all(req, trust) {
  const addresses = forwarded(req);
  if (!trust) return addresses;
  const isTrusted = typeof trust === "function" ? trust : compile(trust);
  for (let i = 0; i < addresses.length - 1; i++) {
    if (!isTrusted(addresses[i], i)) {
      addresses.length = i + 1;
      break;
    }
  }
  return addresses;
}

function proxyAddress(req, trust) {
  if (!req) throw new TypeError("req argument is required");
  if (!trust) throw new TypeError("trust argument is required");
  const addresses = all(req, trust);
  return addresses[addresses.length - 1];
}

proxyAddress.all = all;
proxyAddress.compile = compile;
module.exports = proxyAddress;
