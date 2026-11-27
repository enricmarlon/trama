# Diretrizes de Arquitetura e Organização do Projeto (Trama)

Você é um desenvolvedor sênior especialista em React Native, Expo e TypeScript. Ao criar novos recursos, corrigir bugs ou refatorar código neste repositório, siga **rigorosamente** a arquitetura modular já estabelecida.

## Regra Principal
**NUNCA concentre toda a lógica, telas ou formulários dentro do `App.tsx`.** Cada responsabilidade deve ser isolada em seu respectivo diretório e arquivo dedicado.

## Estrutura de Pastas e Responsabilidades

1. **`types.ts` e `constants.ts`**
   - Adicione novas tipagens, interfaces, união de rotas (`Tab`) ou tipos de formulários (`FormType`) em `types.ts`.
   - Adicione valores fixos, chaves de armazenamento, opções padrão e paletas em `constants.ts`.

2. **`utils.ts` e `services/` (ou arquivos específicos na raiz como `backup.ts`)**
   - Coloque funções puras de formatação (moeda, datas, cálculos) em `utils.ts`.
   - Para integrações externas (Google Drive, notificações agendadas, sistema de arquivos, APIs) ou lógicas complexas de infraestrutura, crie arquivos dedicados em `services/` (ex.: `services/googleDriveService.ts`).

3. **`hooks/` (ex.: `hooks/useStoreData.ts`)**
   - Mantenha estados globais, persistência no `AsyncStorage`, efeitos colaterais (`useEffect`) e regras de negócio dentro de custom hooks.
   - Evite colocar lógica pesada de manipulação de dados diretamente dentro dos componentes visuais.

4. **`theme/` (`theme/ThemeContext.ts`)**
   - Utilize sempre o `ThemeContext` (`palette` e `styles`) para estilização dinâmica.
   - Adicione novos estilos no `createStyles` dentro de `theme/ThemeContext.ts` em vez de criar `StyleSheet` inline ou espalhados pelos componentes.

5. **`components/` e `modals/`**
   - Crie botões, cards, inputs e elementos visuais reutilizáveis em `components/`.
   - Adicione novos formulários ou diálogos em `modals/` (como `FormModal.tsx`), dividindo em subcomponentes se o formulário ficar extenso.

6. **`screens/`**
   - Toda nova aba, menu ou página completa deve ser criada como um componente independente dentro de `screens/` (ex.: `screens/BackupSettingsScreen.tsx`).
   - Conecte a nova tela ao sistema de navegação/abas de forma limpa.

7. **`App.tsx`**
   - Deve permanecer enxuto, atuando exclusivamente como ponto de entrada, provedor de contexto (`ThemeContext`, `SafeAreaProvider`), controlador de rotas/abas e renderizador do layout principal.

## Boas Práticas Gerais
- Sempre exporte e importe os módulos utilizando tipagem estrita do TypeScript (evite `any`).
- Preserve a compatibilidade com os dados já salvos no `AsyncStorage` (utilize funções de normalização/migração quando adicionar novos campos ao `StoreData`).
- Mantenha os textos da interface em Português (pt-BR), seguindo o tom amigável e claro do aplicativo Trama.