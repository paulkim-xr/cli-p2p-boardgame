import argparse, json, os

DEFAULT_PORT = 47777


def load_port(argv=None):
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--port', type=int)
    args, _ = parser.parse_known_args(argv)
    if args.port:
        return args.port
    if 'PORT' in os.environ:
        return int(os.environ['PORT'])
    try:
        with open('config.json') as f:
            return int(json.load(f).get('port', DEFAULT_PORT))
    except (FileNotFoundError, KeyError, ValueError):
        return DEFAULT_PORT
