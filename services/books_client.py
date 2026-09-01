"""
Open Library & Google Books API Client for Avenly Hub
Free, open API for book search, reading lists, and audiobook details.
No key required for Open Library (openlibrary.org).
"""

import urllib.request
import urllib.parse
import json
from config.secrets import OPEN_LIBRARY_API_URL, GOOGLE_BOOKS_API_KEY

def search_books(query="gardening, classic literature, nature", limit=6):
    """
    Searches for books via Open Library API.
    """
    encoded_query = urllib.parse.quote(query)
    endpoint = f"{OPEN_LIBRARY_API_URL}/search.json?q={encoded_query}&limit={limit}"
    req = urllib.request.Request(endpoint, headers={'User-Agent': 'AvenlyHub/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                docs = data.get("docs", [])
                books = []
                for d in docs:
                    cover_i = d.get("cover_i")
                    cover_url = f"https://covers.openlibrary.org/b/id/{cover_i}-M.jpg" if cover_i else "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&fit=crop"
                    books.append({
                        "key": d.get("key"),
                        "title": d.get("title", "Untitled Book"),
                        "author": ", ".join(d.get("author_name", ["Unknown Author"])),
                        "first_publish_year": d.get("first_publish_year", "N/A"),
                        "cover": cover_url,
                        "subject": ", ".join(d.get("subject", [])[:3])
                    })
                return books
    except Exception as e:
        print(f"Open Library API error: {e}")

    # Fallback curated books list
    return [
        {
            "key": "/works/OL123",
            "title": "The Secret Garden",
            "author": "Frances Hodgson Burnett",
            "first_publish_year": 1911,
            "cover": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&fit=crop",
            "subject": "Nature, Gardening, Children Literature"
        },
        {
            "key": "/works/OL456",
            "title": "All Creatures Great and Small",
            "author": "James Herriot",
            "first_publish_year": 1972,
            "cover": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&fit=crop",
            "subject": "Animals, Countryside, Heartwarming"
        },
        {
            "key": "/works/OL789",
            "title": "The Wind in the Willows",
            "author": "Kenneth Grahame",
            "first_publish_year": 1908,
            "cover": "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=300&fit=crop",
            "subject": "Friendship, Nature, Classic"
        }
    ]
