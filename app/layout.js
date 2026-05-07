import './globals.css';

export const metadata = {
  title: 'Consulta CNPJ — ReceitaWS',
  description: 'Ferramenta de consulta de CNPJ individual e em lote com exportação para XLSX.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen relative">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
