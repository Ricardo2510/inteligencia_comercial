DASHBOARD WEB — INTELIGÊNCIA COMERCIAL HIDRÁULICA

Como abrir:
1. Extraia o ZIP.
2. Abra o arquivo index.html com duplo clique.
3. O painel funciona localmente, sem GitHub e sem servidor.

Base enriquecida:
- 116 ofertas comerciais.
- 54 novos casos adicionados nesta versão.
- Novos canais/varejistas incluídos na base de exemplos: Telhanorte, Ferreira Costa, Carajás, Obramax, Ferreira Costa Empresas e Calha Úmida.
- Reforço de referências Blukit para comparação com o mercado.

Conteúdo:
- assets/data.js: base de ofertas embutida para funcionar via file://.
- assets/styles.css: identidade visual escura inspirada no modelo de dashboard enviado.
- assets/app.js: filtros, KPIs, gráficos SVG, heatmap, simulador Blukit e tabela.
- base_ofertas_enriquecida.csv: cópia da base completa em CSV.

KPIs e visuais:
- Ofertas, lojas, marcas, preço mediano e comparabilidade A/B.
- Faixa de preço mínimo/mediana/máximo por item.
- Comparabilidade A/B/C/D.
- Maior dispersão por item.
- Índice de preço médio por loja vs mercado.
- Mix de nível de produto.
- Heatmap loja x item.
- Blukit × mercado por item.
- Comparativo Blukit × mercado por item, sem simulador de cenário.
- Tabela analítica com exportação CSV filtrada.

Observação sobre o simulador:
- O heatmap alterna entre visão por loja e visão por marca.
- Trata-se de uma simulação comercial para comparar posicionamento de preço.
- Caso a regra desejada seja margem bruta sobre custo, a fórmula pode ser ajustada.


Atualização: removido o simulador de cenário de margem Blukit. O heatmap agora alterna entre visão por loja e por marca; na visão por marca, as células exibem preço de referência consolidado por marca e item.


ATUALIZAÇÃO - benchmark ampliado e hover de produto
-----------------------------------------------------
- Base ampliada para 228 ofertas.
- Foram adicionadas mais de 100 observações de mercado nos mesmos itens do projeto.
- A tabela analítica agora mostra um indicador visual quando há imagem cadastrada.
- Ao passar o mouse sobre uma linha com indicador, aparece uma prévia do produto.
- As imagens PNG ficam em assets/product-images/ e são usadas como referência visual.
- As imagens são apenas apoio de apresentação e não substituem a validação de SKU.
