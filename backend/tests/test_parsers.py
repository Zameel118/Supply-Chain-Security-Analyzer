"""Unit tests for ecosystem dependency parsers."""

from app.services.parsers.maven import parse_pom_xml
from app.services.parsers.npm import parse_package_json, parse_package_lock
from app.services.parsers.python import parse_requirements_txt
from app.services.parsers.ruby import parse_gemfile_lock


def test_parse_package_json_direct_deps():
    content = """
    {
      "name": "demo",
      "dependencies": {
        "lodash": "^4.17.21",
        "react": "18.2.0"
      },
      "devDependencies": {
        "typescript": "5.0.0"
      }
    }
    """
    deps = parse_package_json(content)
    names = {d.name for d in deps}
    assert names == {"lodash", "react"}
    lodash = next(d for d in deps if d.name == "lodash")
    assert lodash.version == "4.17.21"
    assert lodash.is_direct is True
    assert lodash.ecosystem == "npm"


def test_parse_package_lock_v2_with_nested():
    content = """
    {
      "name": "demo",
      "lockfileVersion": 3,
      "packages": {
        "": {
          "dependencies": { "parent-pkg": "1.0.0" }
        },
        "node_modules/parent-pkg": {
          "version": "1.0.0",
          "dependencies": { "child-pkg": "2.0.0" }
        },
        "node_modules/parent-pkg/node_modules/child-pkg": {
          "version": "2.0.0"
        },
        "node_modules/top-level-child": {
          "version": "9.9.9"
        }
      }
    }
    """
    deps = parse_package_lock(content)
    by_name = {d.name: d for d in deps}
    assert by_name["parent-pkg"].is_direct is True
    assert by_name["parent-pkg"].depth == 0
    assert by_name["child-pkg"].is_direct is False
    assert by_name["child-pkg"].depth == 1
    assert by_name["child-pkg"].parent_key is not None
    assert by_name["top-level-child"].depth == 0
    assert by_name["top-level-child"].is_direct is False


def test_parse_requirements_txt():
    content = """
    # comment
    fastapi==0.115.6
    sqlalchemy>=2.0.0
    -r other.txt
    requests[security]==2.31.0
    """
    deps = parse_requirements_txt(content)
    by_name = {d.name: d for d in deps}
    assert set(by_name) == {"fastapi", "sqlalchemy", "requests"}
    assert by_name["fastapi"].version == "0.115.6"
    assert by_name["sqlalchemy"].version == "2.0.0"
    assert by_name["requests"].version == "2.31.0"
    assert all(d.ecosystem == "PyPI" and d.is_direct for d in deps)


def test_parse_gemfile_lock_direct_and_nested():
    content = """
GEM
  remote: https://rubygems.org/
  specs:
    rails (7.0.0)
      actionpack (= 7.0.0)
    actionpack (7.0.0)

DEPENDENCIES
  rails
"""
    deps = parse_gemfile_lock(content)
    by_name = {d.name: d for d in deps}
    assert by_name["rails"].is_direct is True
    assert by_name["actionpack"].is_direct is False
    assert by_name["actionpack"].parent_key is not None


def test_parse_pom_xml():
    content = """
    <project xmlns="http://maven.apache.org/POM/4.0.0">
      <dependencies>
        <dependency>
          <groupId>org.apache.commons</groupId>
          <artifactId>commons-lang3</artifactId>
          <version>3.12.0</version>
        </dependency>
      </dependencies>
    </project>
    """
    deps = parse_pom_xml(content)
    assert len(deps) == 1
    assert deps[0].name == "org.apache.commons:commons-lang3"
    assert deps[0].version == "3.12.0"
    assert deps[0].ecosystem == "Maven"
