# Card Play

App de tarot em PixiJS 7 + TypeScript, empacotado com webpack. Duas versões lado a lado:
`v1/` (original, congelada) e `v2/` (onde o desenvolvimento acontece). `/` redireciona para `/v2/`.

## Servidor de desenvolvimento

- `http://localhost:1235` (porta em `webpack.config.js`; a 1234 é do container de produção).
- Suba, teste e desligue **no mesmo comando**; em tarefa de background o servidor é encerrado
  pelo limite de tempo antes do teste terminar:
  ```sh
  node node_modules/webpack-cli/bin/cli.js serve --mode=development > "$LOG" 2>&1 & S=$!
  for i in $(seq 1 60); do [ $(grep -c compiled "$LOG") -ge 2 ] && break; sleep 2; done  # v1 e v2
  <teste>; R=$?
  kill $S; wait $S 2>/dev/null; exit $R
  ```
- Navegador de teste: imagem `mcr.microsoft.com/playwright:v1.48.0-jammy` com
  `--network container:$(hostname)`, para enxergar o `localhost:1235` do ambiente do Claude.
  Os scripts precisam ficar numa pasta que o daemon do Docker enxerga (ex.: o workspace da tarefa), não em `/tmp`.
- O navegador headless roda WebGL por software e fica lento (poucos fps): animações demoram bem mais
  e eventos chegam espaçados. Não confundir lentidão do ambiente com bug.

## Dependências

- Instalar com `npx -y npm@10 ci --include=dev`. O npm 11 recusa o `package-lock.json` atual
  (falta a entrada opcional `fsevents`); o npm 10, o mesmo da imagem Docker, aceita sem reescrever o lock.

## Produção (Docker)

- `Dockerfile` multi-stage (node build → nginx) + `nginx.conf`; container `cardplay` na porta 1234:
  `docker build -t cardplay . && docker rm -f cardplay && docker run -d --name cardplay -p 1234:80 --restart unless-stopped cardplay`
- O build de produção remove `console.*` (terser `drop_console`): para depurar, use o servidor de desenvolvimento.
