import os, sys, json
sys.path.insert(0, 'clients/python')
from framework import config


def test_default_port():
    os.environ.pop('PORT', None)
    assert config.load_port([]) == 47777


def test_flag_overrides_default():
    assert config.load_port(['--port', '55555']) == 55555


def test_env_overrides_default(monkeypatch):
    monkeypatch.setenv('PORT', '44444')
    assert config.load_port([]) == 44444


def test_flag_overrides_env(monkeypatch):
    monkeypatch.setenv('PORT', '44444')
    assert config.load_port(['--port', '55555']) == 55555


def test_config_file(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / 'config.json').write_text('{"port": 33333}')
    monkeypatch.delenv('PORT', raising=False)
    assert config.load_port([]) == 33333
