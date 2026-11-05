import re
c = open('mrc_forms/Memo-Template.html', 'r', encoding='utf-8').read()
c = re.sub(r'<div class="recipient-item">.*?Recipient 3 Title\]</span></div>', '[Recipient Rows]', c, flags=re.DOTALL)
open('mrc_forms/Memo-Template.html', 'w', encoding='utf-8').write(c)
