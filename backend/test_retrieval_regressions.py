"""Offline regression checks: no database, model downloads, or credentials."""
import ast
import re
import unittest
from pathlib import Path


class RetrievalRegressions(unittest.TestCase):
    def test_short_heading_is_not_lost(self):
        tree = ast.parse(Path(__file__).with_name('vector_store.py').read_text(encoding='utf-8'))
        fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'create_intelligent_chunks')
        ns = {'List': list, 're': re}
        exec(compile(ast.Module(body=[fn], type_ignores=[]), '<chunker>', 'exec'), ns)
        chunks = ns['create_intelligent_chunks']('UNIVERSITY MISSION\n\n' + 'x' * 1790)
        self.assertIn('UNIVERSITY MISSION', ' '.join(chunks))
        self.assertTrue(all(len(c) <= 1800 for c in chunks))

    def test_disclaimer_does_not_exempt_speculation(self):
        tree = ast.parse(Path(__file__).with_name('main.py').read_text(encoding='utf-8'))
        fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'ask_policy')
        assignments = [n for n in ast.walk(fn) if isinstance(n, ast.Assign)]
        markers = next(ast.literal_eval(n.value) for n in assignments if any(isinstance(t, ast.Name) and t.id == 'speculation_markers' for t in n.targets))
        condition = next(n.test for n in ast.walk(fn) if isinstance(n, ast.If) and 'speculation_markers' in ast.unparse(n.test))
        answer = 'The mission is not provided. However, I can infer some values.'
        self.assertTrue(eval(compile(ast.Expression(condition), '<guard>', 'eval'), {'speculation_markers': markers, 'answer_lower': answer.lower()}))


if __name__ == '__main__':
    unittest.main()
