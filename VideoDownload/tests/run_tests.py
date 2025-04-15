#!/usr/bin/env python
"""
Test runner for VideoDownload application.
Runs all tests, including unit tests and integration tests.
"""

import os
import sys
import pytest
import argparse

def run_tests():
    """Run all tests in the tests directory"""
    # Add the parent directory to the path so imports work correctly
    sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
    
    parser = argparse.ArgumentParser(description="Run tests for VideoDownload application")
    parser.add_argument("--unit", action="store_true", help="Run only unit tests")
    parser.add_argument("--integration", action="store_true", help="Run only integration tests")
    parser.add_argument("--all", action="store_true", help="Run all tests including slow ones")
    args = parser.parse_args()
    
    # Default command to run tests
    pytest_args = ["-v"]
    
    # Filter tests based on command line arguments
    if args.unit:
        pytest_args.append("tests/unit_tests/")
    elif args.integration:
        pytest_args.append("tests/integration_tests/")
    
    # By default, skip slow tests unless --all is specified
    if not args.all:
        pytest_args.append("-k")
        pytest_args.append("not slow")
    
    print(f"Running tests with args: {pytest_args}")
    return pytest.main(pytest_args)

if __name__ == "__main__":
    sys.exit(run_tests())