import re
with open('src/pages/app/PriceNegotiationPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

new_btn = '''<button 
                                    key={mode.id}
                                    onClick={() => setBookingPriority(mode.id as any)}
                                    className={\lex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl transition-all duration-200 \\}
                                >
                                    <Icon size={16} className={isActive ? mode.iconClass : 'text-gray-400'} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className="text-[11px] font-black uppercase tracking-widest">{mode.label}</span>
                                </button>'''

text = re.sub(r'<button\s+key=\{mode\.id\}[\s\S]*?</button>', new_btn, text, count=1)

with open('src/pages/app/PriceNegotiationPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
