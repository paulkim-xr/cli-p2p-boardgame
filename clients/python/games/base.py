from abc import ABC, abstractmethod
from typing import List, Tuple, Optional


class BaseGame(ABC):
    min_players: int = 2
    max_players: int = 2

    def start(self, players: List[str]) -> None:
        self.players = players
        self._over = False
        self._winner = None

    @abstractmethod
    def validate_move(self, player_id: str, move_data: dict) -> bool: ...

    @abstractmethod
    def apply_move(self, player_id: str, move_data: dict) -> None: ...

    @abstractmethod
    def render(self, perspective: Optional[str] = None) -> str:
        """Return a string representation of the current game state."""
        ...

    @abstractmethod
    def get_state(self, perspective: Optional[str] = None) -> dict:
        """Return a JSON-serializable snapshot of state for this player."""
        ...

    @abstractmethod
    def load_state(self, data: dict, perspective: Optional[str] = None) -> None:
        """Apply a received state snapshot, replacing internal state."""
        ...

    @abstractmethod
    def is_over(self) -> Tuple[bool, Optional[str]]: ...

    @abstractmethod
    def current_turn(self) -> Optional[str]: ...

    @abstractmethod
    def parse_input(self, raw: str) -> Optional[dict]:
        """Parse natural text input into a move dict. Return None if unrecognized."""
        ...

    @abstractmethod
    def get_help(self) -> List[str]:
        """Return help lines shown when player types ?."""
        ...
