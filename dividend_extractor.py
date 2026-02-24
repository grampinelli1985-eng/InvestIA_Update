import asyncio
import pandas as pd
from playwright.async_api import async_playwright
import time
import os

# Configuração
PORTFOLIO_URL = "https://investidor10.com.br/carteiras/proventos/541619/"
OUTPUT_FILE = "dividendos_carteira.xlsx"

async def extract_dividends():
    async with async_playwright() as p:
        # Lançar o navegador (headless=False permite que você veja o que está acontecendo e faça login se necessário)
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        print(f"Navegando para: {PORTFOLIO_URL}")
        await page.goto(PORTFOLIO_URL)

        # Verificar se precisa de login
        if await page.query_selector("form.login-form") or await page.query_selector("text='Entrar'"):
            print("\n!!! ATENÇÃO: Parece que o login é necessário !!!")
            print("Por favor, faça o login na janela do navegador que abriu.")
            print("O script aguardará 60 segundos ou até você fechar o aviso (se houver) e a tabela aparecer.")
            
            # Esperar até que a tabela de proventos esteja visível (ajuste o seletor conforme necessário)
            # No Investidor10, a tabela de proventos geralmente fica dentro de uma div ou seção específica
            try:
                # Tenta encontrar a tabela de proventos por 2 minutos
                await page.wait_for_selector("table", timeout=120000)
            except Exception as e:
                print("Tempo esgotado aguardando o login ou o carregamento da tabela.")
                await browser.close()
                return

        print("Tabela detectada. Extraindo dados...")
        
        # Aguarda um pouco para garantir que todos os dados foram renderizados
        await asyncio.sleep(3)

        # Extrair dados da tabela
        # No Investidor10 a tabela pode ter IDs diferentes, vamos buscar por tabelas na página
        tables = await page.query_selector_all("table")
        
        dividend_data = []
        
        for table in tables:
            headers = await table.query_selector_all("thead th")
            header_texts = [await h.inner_text() for h in headers]
            
            # Procurar a tabela que contém "Ativo" ou "Ticker" e "Valor"
            if any("Ativo" in h or "Ticker" in h for h in header_texts) and any("Valor" in h for h in header_texts):
                rows = await table.query_selector_all("tbody tr")
                for row in rows:
                    cols = await row.query_selector_all("td")
                    row_data = [await c.inner_text() for c in cols]
                    if row_data:
                        dividend_data.append(row_data)
                
                # Se encontramos a tabela certa, podemos parar
                final_headers = header_texts
                break
        else:
            print("Não foi possível encontrar a tabela de proventos.")
            await browser.close()
            return

        # Criar DataFrame
        df = pd.DataFrame(dividend_data, columns=final_headers)

        # Salvar em Excel
        print(f"Salvando dados em {OUTPUT_FILE}...")
        df.to_excel(OUTPUT_FILE, index=False)
        
        print("\nSucesso! O arquivo foi gerado com sucesso.")
        print(f"Caminho: {os.path.abspath(OUTPUT_FILE)}")
        
        await asyncio.sleep(5)
        await browser.close()

if __name__ == "__main__":
    # Verificar se as dependências estão instaladas
    try:
        import openpyxl
    except ImportError:
        print("Instalando dependências necessárias...")
        os.system("pip install pandas openpyxl playwright")
        os.system("playwright install chromium")
    
    asyncio.run(extract_dividends())
