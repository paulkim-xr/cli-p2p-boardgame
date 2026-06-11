from abc import ABC, abstractmethod
from typing import List, Tuple, Optional


class BaseGame(ABC):
    min_players: int = 2
    max_players: int = 2

    def start(self, players: List[str]) -> None:
        self.players = players

    @abstractmethod
    def validate_move(self, player_id: str, move_data: dict) -> bool: ...

    @abstractmethod
    def apply_move(self, player_id: str, move_data: dict) -> None: ...

    @abstractmethod
    def render(self, perspective: Optional[str] = None) -> str: ...

    @abstractmethod
    def get_state(self, perspective: Optional[str] = None) -> dict: ...

    @abstractmethod
    def is_over(self) -> Tuple[bool, Optional[str]]: ...

    @abstractmethod
    def current_turn(self) -> Optional[str]: ...
