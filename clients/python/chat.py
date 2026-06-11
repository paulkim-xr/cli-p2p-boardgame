import time


class ChatLog:
    def __init__(self, maxlen=100):
        self._log = []
        self._maxlen = maxlen

    def add(self, from_name, text):
        self._log.append({'from': from_name, 'text': text, 'ts': time.time()})
        if len(self._log) > self._maxlen:
            self._log.pop(0)

    def recent(self, n=10):
        return self._log[-n:]

    def all(self):
        return list(self._log)
