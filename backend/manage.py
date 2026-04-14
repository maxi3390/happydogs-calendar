#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nursery.settings')

    # Automatically use test settings when running tests so that an
    # in-memory SQLite database is used instead of the main PostgreSQL
    # database — even if the caller forgets --settings=nursery.test_settings.
    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        os.environ['DJANGO_SETTINGS_MODULE'] = 'nursery.test_settings'

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
