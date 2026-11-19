# Ritmo

App web para registrar treinos de corrida, caminhada e ciclismo usando o GPS do celular.

## Recursos

- Registra distância e duração dos treinos.
- Mostra resumo semanal, recordes e atividades recentes.
- Salva o histórico no próprio navegador, sem conta.
- Pode ser instalado no celular e usado offline após o primeiro acesso.

## Como usar

1. Publique o projeto em um endereço HTTPS.
2. Abra no celular e permita o acesso à localização.
3. Escolha uma atividade e toque em **Iniciar treino**.
4. Quando terminar, toque em **Finalizar treino**.

O GPS funciona sem internet, mas o app precisa ser aberto online uma vez para preparar o uso offline. O histórico fica neste aparelho e pode ser apagado ao limpar os dados do navegador.

## Executar localmente

Abra a pasta no VS Code, inicie o **Live Server** e acesse `index.html`. Para usar o GPS, permita a localização no navegador.

## Velocidade e calorias

A velocidade média aparece no resumo de cada treino. Para estimar calorias, informe seu peso; o cálculo usa uma intensidade padrão por atividade e não mede o gasto real. Treinos anteriores a esta atualização não têm estimativa de calorias.

## Tecnologias

HTML, CSS e JavaScript, com Geolocation API, armazenamento local e service worker.
