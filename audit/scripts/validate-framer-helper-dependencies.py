#!/usr/bin/env python3
"""Validate the deterministic, read-only MM.S Framer helper dependency boundary."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[2]
CONTRACT_RELATIVE = Path("audit/contracts/framer-helper-dependencies.json")
EXPECTED = {
    "framer-api": {
        "version": "0.1.7",
        "resolved": "https://registry.npmjs.org/framer-api/-/framer-api-0.1.7.tgz",
        "integrity": "sha512-kMyARTKMt0hJX6Onn6KbuFMSQKWNh7Jw9L8IQm0OLbJjyeiVqy4Skt47xQYq7OV9XTShSDM3GGH9zRcZEcNKZw==",
        "devalue_constraint": "^5.6.4",
    },
    "devalue": {
        "version": "5.8.2",
        "resolved": "https://registry.npmjs.org/devalue/-/devalue-5.8.2.tgz",
        "integrity": "sha512-DObPPAfdtFbXjxLqK8s2Xk9ZuWz5+ZoFEhC7J76es4GU/rEiXwHTmbImoCdyoCOcBH1UF3+Cz6Z2sYD4hyl5TA==",
        "advisory": "GHSA-77vg-94rm-hx3p",
        "affected_range": ">=5.6.3 <=5.8.0",
    },
}
EXPECTED_CONFIG_PATHS = {"package.json", "package-lock.json", "dependency-smoke-test.mjs"}
EXPECTED_SOURCE_CALLS = {
    "index.mjs": ["getProjectInfo", "disconnect"],
    "read-design-system.mjs": ["getColorStyles", "getTextStyles", "getProjectInfo", "disconnect"],
}


class FramerDependencyError(RuntimeError):
    pass


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def version_tuple(value: str) -> tuple[int, ...]:
    if not re.fullmatch(r"\d+(?:\.\d+)+", value):
        raise FramerDependencyError(f"non-numeric dependency version: {value!r}")
    return tuple(int(part) for part in value.split("."))


def unique_map(items: object, label: str) -> dict[str, dict]:
    if not isinstance(items, list):
        raise FramerDependencyError(f"{label} must be a list")
    mapped: dict[str, dict] = {}
    for item in items:
        if not isinstance(item, dict) or not isinstance(item.get("path"), str):
            raise FramerDependencyError(f"{label} entries must be path objects")
        if item["path"] in mapped:
            raise FramerDependencyError(f"duplicate {label} path: {item['path']}")
        mapped[item["path"]] = item
    return mapped


def verify_contract(contract: dict) -> tuple[dict[str, dict], dict[str, dict]]:
    if contract.get("schema_version") != 1:
        raise FramerDependencyError("unsupported Framer helper contract schema")
    if contract.get("issue") != "MMS-AUD-038":
        raise FramerDependencyError("Framer helper contract issue drift")
    if contract.get("status") != "tooling-only-pinned":
        raise FramerDependencyError("Framer helper contract status drift")
    if contract.get("helper_directory") != "Framer/MM.S Framer API":
        raise FramerDependencyError("Framer helper directory drift")
    if contract.get("node_engine_minimum") != 22:
        raise FramerDependencyError("Framer helper Node minimum drift")
    if contract.get("packages") != EXPECTED:
        raise FramerDependencyError("reviewed Framer dependency identities drifted")

    configs = unique_map(contract.get("config_files"), "config_files")
    if set(configs) != EXPECTED_CONFIG_PATHS:
        raise FramerDependencyError("Framer helper config file set drift")
    sources = unique_map(contract.get("read_only_sources"), "read_only_sources")
    if set(sources) != set(EXPECTED_SOURCE_CALLS):
        raise FramerDependencyError("Framer helper read-only source set drift")
    for path, calls in EXPECTED_SOURCE_CALLS.items():
        if sources[path].get("allowed_remote_calls") != calls:
            raise FramerDependencyError(f"{path}: reviewed remote-call contract drift")
    return configs, sources


def verify_hashes(helper: Path, entries: dict[str, dict], label: str) -> None:
    for relative, entry in entries.items():
        path = helper / relative
        if not path.is_file():
            raise FramerDependencyError(f"{label} file missing: {relative}")
        expected = entry.get("sha256")
        if not isinstance(expected, str) or not re.fullmatch(r"[0-9a-f]{64}", expected):
            raise FramerDependencyError(f"{label} hash is invalid: {relative}")
        if digest(path) != expected:
            raise FramerDependencyError(f"{label} hash drift: {relative}")


def verify_package_files(helper: Path) -> None:
    package = load_json(helper / "package.json")
    if package.get("private") is not True or package.get("type") != "module":
        raise FramerDependencyError("Framer helper must remain a private ESM tool")
    if package.get("dependencies") != {"framer-api": EXPECTED["framer-api"]["version"]}:
        raise FramerDependencyError("framer-api must be an exact reviewed pin")
    if package.get("overrides") != {"devalue": EXPECTED["devalue"]["version"]}:
        raise FramerDependencyError("devalue must be an exact reviewed override")
    scripts = package.get("scripts", {})
    if scripts.get("test") != "node dependency-smoke-test.mjs":
        raise FramerDependencyError("Framer helper smoke-test script drift")
    if scripts.get("audit:dependencies") != "npm audit --package-lock-only --omit=dev --audit-level=low":
        raise FramerDependencyError("Framer helper online-audit script drift")
    expected_scripts = {"start", "read:design", "test", "audit:dependencies"}
    if set(scripts) != expected_scripts:
        raise FramerDependencyError("Framer helper script set drift")
    if any(key in package for key in ("preinstall", "install", "postinstall", "prepare")):
        raise FramerDependencyError("Framer helper package gained an install lifecycle hook")

    lock = load_json(helper / "package-lock.json")
    if lock.get("lockfileVersion") != 3 or lock.get("requires") is not True:
        raise FramerDependencyError("Framer helper lockfile format drift")
    packages = lock.get("packages")
    if not isinstance(packages, dict):
        raise FramerDependencyError("Framer helper lockfile packages are missing")
    expected_lock_nodes = {
        "",
        "node_modules/csstype",
        "node_modules/devalue",
        "node_modules/framer-api",
        "node_modules/std-env",
    }
    if set(packages) != expected_lock_nodes:
        raise FramerDependencyError("Framer helper lockfile package set drift")
    root_entry = packages.get("")
    if not isinstance(root_entry, dict) or root_entry.get("dependencies") != package["dependencies"]:
        raise FramerDependencyError("Framer helper root lock entry drift")

    framer = packages.get("node_modules/framer-api")
    devalue = packages.get("node_modules/devalue")
    if not isinstance(framer, dict) or not isinstance(devalue, dict):
        raise FramerDependencyError("reviewed Framer dependency nodes are missing")
    for name, entry in (("framer-api", framer), ("devalue", devalue)):
        expected = EXPECTED[name]
        for field in ("version", "resolved", "integrity"):
            if entry.get(field) != expected[field]:
                raise FramerDependencyError(f"{name} lockfile {field} drift")
        if entry.get("license") != "MIT":
            raise FramerDependencyError(f"{name} license drift")
    if framer.get("dependencies", {}).get("devalue") != EXPECTED["framer-api"]["devalue_constraint"]:
        raise FramerDependencyError("framer-api devalue constraint drift")
    if framer.get("dependencies", {}).get("csstype") != "^3.1.1":
        raise FramerDependencyError("framer-api csstype constraint drift")
    if framer.get("dependencies", {}).get("std-env") != "^4.0.0":
        raise FramerDependencyError("framer-api std-env constraint drift")
    if framer.get("engines", {}).get("node") != ">=22":
        raise FramerDependencyError("framer-api Node engine drift")

    resolved = version_tuple(devalue["version"])
    if version_tuple("5.6.3") <= resolved <= version_tuple("5.8.0"):
        raise FramerDependencyError("devalue remains inside GHSA-77vg-94rm-hx3p")


def verify_read_only_sources(helper: Path, sources: dict[str, dict]) -> None:
    for relative, expected_calls in EXPECTED_SOURCE_CALLS.items():
        source = (helper / relative).read_text(encoding="utf-8")
        calls = re.findall(r"\bframer\.([A-Za-z_$][\w$]*)\s*\(", source)
        if set(calls) != set(expected_calls) or len(calls) != len(expected_calls):
            raise FramerDependencyError(
                f"{relative}: remote calls {calls!r} do not match reviewed read-only calls"
            )
        if source.count("connect(projectUrl, apiKey)") != 1:
            raise FramerDependencyError(f"{relative}: explicit connect boundary drift")
        if not re.search(r"finally\s*{[\s\S]*await framer\.disconnect\(\)", source):
            raise FramerDependencyError(f"{relative}: guaranteed disconnect boundary drift")


def verify_tracked(root: Path, contract: dict, configs: dict[str, dict], sources: dict[str, dict]) -> None:
    result = subprocess.run(
        ["git", "ls-files", "--cached"],
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise FramerDependencyError("could not enumerate Git-tracked Framer helper inputs")
    tracked = set(result.stdout.splitlines())
    helper_directory = contract["helper_directory"]
    required = {
        str(CONTRACT_RELATIVE),
        "audit/scripts/validate-framer-helper-dependencies.py",
        *(f"{helper_directory}/{relative}" for relative in configs),
        *(f"{helper_directory}/{relative}" for relative in sources),
    }
    missing = required - tracked
    if missing:
        raise FramerDependencyError(f"Framer helper contract inputs are not Git-tracked: {sorted(missing)}")


def verify(root: Path, require_tracked: bool = True) -> None:
    contract = load_json(root / CONTRACT_RELATIVE)
    configs, sources = verify_contract(contract)
    helper = root / contract["helper_directory"]
    if require_tracked:
        verify_tracked(root, contract, configs, sources)
    verify_hashes(helper, configs, "config")
    verify_hashes(helper, sources, "read-only source")
    verify_package_files(helper)
    verify_read_only_sources(helper, sources)


def run_checked(command: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise FramerDependencyError(
            f"command failed ({' '.join(command)}):\n{result.stdout}\n{result.stderr}"
        )
    return result


def run_installed_smoke(root: Path, online_audit: bool) -> None:
    contract = load_json(root / CONTRACT_RELATIVE)
    source = root / contract["helper_directory"]
    with tempfile.TemporaryDirectory(prefix="mms-framer-helper-install-") as directory:
        helper = Path(directory)
        for relative in (
            "package.json",
            "package-lock.json",
            "dependency-smoke-test.mjs",
            "index.mjs",
            "read-design-system.mjs",
        ):
            shutil.copy2(source / relative, helper / relative)
        run_checked(
            ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"],
            helper,
        )
        run_checked(["npm", "test"], helper)
        tree = json.loads(run_checked(["npm", "ls", "--all", "--json"], helper).stdout)
        direct = tree.get("dependencies", {})
        if direct.get("framer-api", {}).get("version") != EXPECTED["framer-api"]["version"]:
            raise FramerDependencyError("installed framer-api tree drift")
        nested = direct["framer-api"].get("dependencies", {})
        if nested.get("devalue", {}).get("version") != EXPECTED["devalue"]["version"]:
            raise FramerDependencyError("installed devalue tree drift")
        if online_audit:
            result = run_checked(
                [
                    "npm",
                    "audit",
                    "--package-lock-only",
                    "--omit=dev",
                    "--audit-level=low",
                    "--json",
                ],
                helper,
            )
            report = json.loads(result.stdout)
            if report.get("vulnerabilities"):
                raise FramerDependencyError("online npm audit returned vulnerability records")
            totals = report.get("metadata", {}).get("vulnerabilities", {})
            if totals.get("total") != 0 or any(
                totals.get(level) != 0
                for level in ("info", "low", "moderate", "high", "critical")
            ):
                raise FramerDependencyError("online npm audit is not zero across every severity")
    print("Framer helper isolated install/API smoke: PASS")
    if online_audit:
        print("Framer helper online npm audit: PASS (0 vulnerabilities)")


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def update_contract_hash(root: Path, collection: str, relative: str) -> None:
    path = root / CONTRACT_RELATIVE
    contract = load_json(path)
    helper = root / contract["helper_directory"]
    for entry in contract[collection]:
        if entry["path"] == relative:
            entry["sha256"] = digest(helper / relative)
            write_json(path, contract)
            return
    raise AssertionError(f"missing fixture contract path: {relative}")


def expect_rejection(label: str, mutate) -> None:
    with tempfile.TemporaryDirectory(prefix="mms-framer-helper-negative-") as directory:
        root = Path(directory)
        (root / "audit/contracts").mkdir(parents=True)
        (root / "Framer").mkdir()
        shutil.copy2(ROOT / CONTRACT_RELATIVE, root / CONTRACT_RELATIVE)
        shutil.copytree(ROOT / "Framer/MM.S Framer API", root / "Framer/MM.S Framer API")
        mutate(root)
        try:
            verify(root, require_tracked=False)
        except FramerDependencyError:
            return
        raise FramerDependencyError(f"negative fixture unexpectedly passed: {label}")


def run_self_test() -> None:
    verify(ROOT)

    def latest_dependency(root: Path) -> None:
        path = root / "Framer/MM.S Framer API/package.json"
        payload = load_json(path)
        payload["dependencies"]["framer-api"] = "latest"
        write_json(path, payload)
        update_contract_hash(root, "config_files", "package.json")

    def vulnerable_override(root: Path) -> None:
        path = root / "Framer/MM.S Framer API/package.json"
        payload = load_json(path)
        payload["overrides"]["devalue"] = "5.8.0"
        write_json(path, payload)
        update_contract_hash(root, "config_files", "package.json")

    def vulnerable_lock(root: Path) -> None:
        path = root / "Framer/MM.S Framer API/package-lock.json"
        payload = load_json(path)
        payload["packages"]["node_modules/devalue"]["version"] = "5.8.0"
        write_json(path, payload)
        update_contract_hash(root, "config_files", "package-lock.json")

    def unsafe_remote_call(root: Path) -> None:
        path = root / "Framer/MM.S Framer API/index.mjs"
        path.write_text(path.read_text(encoding="utf-8") + "\nawait framer.publish()\n", encoding="utf-8")
        update_contract_hash(root, "read_only_sources", "index.mjs")

    def remove_disconnect(root: Path) -> None:
        path = root / "Framer/MM.S Framer API/index.mjs"
        path.write_text(path.read_text(encoding="utf-8").replace("await framer.disconnect()", ""), encoding="utf-8")
        update_contract_hash(root, "read_only_sources", "index.mjs")

    mutations = {
        "floating framer-api dependency": latest_dependency,
        "vulnerable devalue override": vulnerable_override,
        "vulnerable devalue lock": vulnerable_lock,
        "unreviewed remote mutation": unsafe_remote_call,
        "missing guaranteed disconnect": remove_disconnect,
        "smoke-test drift": lambda root: (root / "Framer/MM.S Framer API/dependency-smoke-test.mjs").write_text("", encoding="utf-8"),
        "issue drift": lambda root: _mutate_contract_issue(root),
    }
    for label, mutation in mutations.items():
        expect_rejection(label, mutation)
    print(f"Framer helper destructive fixtures: PASS ({len(mutations)} rejected)")


def _mutate_contract_issue(root: Path) -> None:
    path = root / CONTRACT_RELATIVE
    contract = load_json(path)
    contract["issue"] = "MMS-AUD-000"
    write_json(path, contract)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--installed-smoke", action="store_true")
    parser.add_argument("--online-audit", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        run_self_test()
    else:
        verify(ROOT)
        print("Framer helper dependency contract: PASS")
    if args.installed_smoke or args.online_audit:
        run_installed_smoke(ROOT, args.online_audit)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
