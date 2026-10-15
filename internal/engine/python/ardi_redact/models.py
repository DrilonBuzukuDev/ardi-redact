"""Language models installed by the desktop setup service."""

import spacy
from spacy.language import Language

MODELS = {
  "en": "en_core_web_md", "de": "de_core_news_md", "es": "es_core_news_md",
  "fr": "fr_core_news_md", "it": "it_core_news_md",
}


def load_model(language: str) -> Language:
  return spacy.load(MODELS.get(language, language))
