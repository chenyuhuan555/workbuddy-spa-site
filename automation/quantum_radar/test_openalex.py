import io
import json
import unittest

from openalex import normalize_work, search_works
from supabase_writer import write_talent_leads


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

    def test_normalize_work_falls_back_when_author_id_is_null(self):
        lead = normalize_work({"authorships": [{"author": {"id": None, "display_name": "无 ID 作者"}}]})
        self.assertEqual(lead.id, "openalex:无 ID 作者")

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

    def test_supabase_writer_requires_explicit_credentials_and_writes_upsert(self):
        with self.assertRaisesRegex(RuntimeError, "SUPABASE_CREDENTIALS_REQUIRED"):
            write_talent_leads([{"id": "openalex:a1"}])
        calls = []

        def opener(request, timeout):
            calls.append((request, timeout))
            return FakeResponse("")

        count = write_talent_leads([{"id": "openalex:a1", "name": "林若川"}], base_url="https://example.supabase.co", service_role_key="test-key", opener=opener)
        self.assertEqual(count, 1)
        self.assertIn("rest/v1/talent_leads", calls[0][0].full_url)
        self.assertEqual(calls[0][0].get_header("Authorization"), "Bearer test-key")


if __name__ == "__main__":
    unittest.main()
