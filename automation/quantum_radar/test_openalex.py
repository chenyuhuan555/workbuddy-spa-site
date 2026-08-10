import io
import json
import unittest

from openalex import normalize_work, search_works


class FakeResponse(io.StringIO):
    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False


class OpenAlexTests(unittest.TestCase):
    def test_normalize_work(self):
        lead = normalize_work({
            "authorships": [{"author": {"id": "a1", "display_name": "林若川"}, "institutions": [{"display_name": "中国科学技术大学"}]}],
            "concepts": [{"display_name": "Quantum computing"}],
        })
        self.assertEqual(lead.id, "openalex:a1")
        self.assertEqual(lead.institution, "中国科学技术大学")

    def test_search_works_is_read_only_and_deduplicates(self):
        payload = {"results": [
            {"authorships": [{"author": {"id": "a1", "display_name": "林若川"}}]},
            {"authorships": [{"author": {"id": "a1", "display_name": "林若川"}}]},
        ]}
        calls = []

        def opener(request, timeout):
            calls.append((request.full_url, timeout))
            return FakeResponse(json.dumps(payload))

        rows = search_works("quantum", limit=10, opener=opener)
        self.assertEqual(len(rows), 1)
        self.assertIn("api.openalex.org/works", calls[0][0])
        self.assertEqual(calls[0][1], 20)


if __name__ == "__main__":
    unittest.main()
