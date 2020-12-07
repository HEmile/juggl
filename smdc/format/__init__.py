from .format import Format
from .typed_list import TypedList
from .cypher import Cypher
from .csv import CSV
FORMAT_TYPES = {"typed_list": TypedList(), "cypher": Cypher(), "csv": CSV()}