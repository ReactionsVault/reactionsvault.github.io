webpack -> vite is smaller, treeshake. It also the same as Browserify, flattens node.js packages so they can be used client side (without server)
typescript build
real website is in `dist` dir after build
to start from scratch (on this repo after Tiagos changes):
npm install
npm run dev <-- (calls vite) start server
npm run build <-- this outputs to `dist` dir.

action to setup page build:
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
this automate build of 'dist' dir on github and deploys github page from it.
action is using workflow file .github/workflows/static.yml

public folder is for things that shouldn't be processed https://vitejs.dev/guide/assets.html#the-public-directory
src is for things that should be 'build'

## React:
https://benediktbergmann.eu/2021/01/17/add-react-and-tests-to-a-typescript-project/
npm install --save react
npm install --save react-dom
npm install --save-dev @types/react @types/react-dom
add 
"jsx": "react",
"moduleResolution": "node",
in 
tsconfig.json

add [typescriptreact][javascriptreact]
in settings.json
