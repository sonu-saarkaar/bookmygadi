
import re

with open('src/pages/app/PriceNegotiationPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

def repl(m):
    return 'className={lex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl transition-all duration-200 }'

text = re.sub(r'className=\{\s*\\.*?\}', repl, text, flags=re.DOTALL)
text = re.sub(r'className=\{\s*\x0c.*?\}', repl, text, flags=re.DOTALL)

with open('src/pages/app/PriceNegotiationPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

