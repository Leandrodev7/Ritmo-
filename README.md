# Ritmo

Um app simples para registrar treinos de corrida, caminhada e ciclismo usando o GPS do celular.

Projeto de **Leandro Dev7**.

## O que ele faz

- Mede a distância e a duração do treino.
- Mostra o resumo da semana, os recordes e os treinos recentes.
- Guarda o histórico neste aparelho, sem conta ou sincronização.
- Pode ser instalado na tela inicial e preparado para abrir sem internet.

## Como usar

1. Abra o app por HTTPS com internet e permita o acesso à localização.
2. No celular, adicione o app à tela inicial pelo menu do navegador.
3. Antes de sair sem internet, abra o app e espere aparecer “App pronto para uso offline”.
4. Escolha a atividade, toque em **Iniciar treino** e aguarde o GPS encontrar sua posição.
5. Toque em **Finalizar treino** para salvar o resultado.

O GPS recebe sinais de satélite e não precisa de internet, mas pode demorar ou falhar em locais fechados, vales ou sob vegetação densa. O histórico fica no armazenamento do navegador deste aparelho; limpar os dados do navegador pode apagá-lo.

## Tecnologias

HTML, CSS e JavaScript, com geolocalização do navegador, armazenamento local e service worker para suporte offline.
