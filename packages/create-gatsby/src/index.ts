import { prompt } from "enquirer"
import cmses from "./cmses.json"
import styles from "./styles.json"
import features from "./features.json"
import { initStarter } from "./init-starter"
import { installPlugins } from "./install-plugins"
import c from "ansi-colors"
import path from "path"
import fs from "fs"
import { PluginName, makePluginConfigQuestions } from "./plugin-options-form"

// eslint-disable-next-line no-control-regex
const INVALID_FILENAMES = /[<>:"/\\|?*\u0000-\u001F]/g
const INVALID_WINDOWS = /^(con|prn|aux|nul|com\d|lpt\d)$/i

// We're using a fork because it points to the canary version of gatsby
const DEFAULT_STARTER = `https://github.com/ascorbic/gatsby-starter-hello-world.git`

const makeChoices = (
  options: Record<string, string>
): Array<{ message: string; name: string }> =>
  Object.entries(options).map(([name, message]) => {
    return { name, message }
  })

const questions = [
  {
    type: `input`,
    name: `project`,
    message: `What would you like to name the folder where your site will be created?`,
    initial: `my-gatsby-site`,
    validate: (value: string): string | boolean => {
      if (INVALID_FILENAMES.test(value)) {
        return `The destination "${value}" is not a valid filename. Please try again, avoiding special characters.`
      }
      if (process.platform === `win32` && INVALID_WINDOWS.test(value)) {
        return `The destination "${value}" is not a valid Windows filename. Please try another name`
      }
      if (fs.existsSync(path.resolve(value))) {
        return `The destination "${value}" already exists. Please choose a different name`
      }
      return true
    },
  },
  {
    type: `select`,
    name: `cms`,
    message: `Will you be using a CMS?`,
    hint: `Use arrow keys to move, and enter to select`,
    choices: makeChoices(cmses),
  },
  {
    type: `select`,
    name: `styling`,
    message: `Would you like to install a styling system?`,
    hint: `Use arrow keys to move, and enter to select`,
    choices: makeChoices(styles),
  },
  {
    type: `multiselect`,
    name: `features`,
    message: `Would you like to install additional features with other plugins?`,
    hint: `Use arrow keys to move, spacebar to select, and enter to confirm your choices`,
    choices: makeChoices(features),
  },
]
interface IAnswers {
  project: string
  styling?: keyof typeof styles
  cms?: keyof typeof cmses
  features?: Array<keyof typeof features>
}

export async function run(): Promise<void> {
  const { version } = require(`../package.json`)

  console.log(c.grey.italic(`create-gatsby version ${version}`))
  console.log(
    `


                         ${c.blueBright.bold.underline(`Welcome to Gatsby!`)}
   
                
`
  )

  console.log(
    c.red.italic(`Important: This is currently for testing purposes only`)
  )

  console.log(
    `This command will generate a new Gatsby site for you with the setup you select.`
  )
  console.log(`Let's answer some questions:\n`)
  const data = await prompt<IAnswers>(questions)

  const messages: Array<string> = [
    `🛠  Create a new Gatsby site in the folder ${c.blueBright(data.project)}`,
  ]

  const plugins: Array<PluginName> = []

  if (data.cms && data.cms !== `none`) {
    messages.push(
      `📚 Install and configure the plugin for ${c.red(cmses[data.cms])}`
    )
    plugins.push(data.cms)
  }

  if (data.styling && data.styling !== `none`) {
    messages.push(
      `🎨 Get you set up to use ${c.green(
        styles[data.styling]
      )} for styling your site`
    )
    plugins.push(data.styling)
  }

  if (data.features?.length) {
    messages.push(
      `🔌 Install ${data.features
        .map((feat: string) => c.magenta(feat))
        .join(`, `)}`
    )
    plugins.push(...data.features)
  }

  const config = makePluginConfigQuestions(plugins)
  let pluginConfig
  if (config.length) {
    console.log(
      `\nGreat! A few of the selections you made need to be configured. Please fill in the options for each plugin now:\n`
    )
    pluginConfig = await prompt<Record<PluginName, {}>>(config)
  }

  console.log(`

${c.bold(`Thanks! Here's what we'll now do:`)}

    ${messages.join(`\n    `)}
  `)

  const { confirm } = await prompt<{ confirm: boolean }>({
    type: `confirm`,
    name: `confirm`,
    initial: `Yes`,
    message: `Shall we do this?`,
    format: value => (value ? c.greenBright(`Yes`) : c.red(`No`)),
  })

  if (!confirm) {
    console.log(`OK, bye!`)
    return
  }

  await initStarter(DEFAULT_STARTER, data.project)

  console.log(
    c.green(`✔ `) + c.bold(`Created site in `) + c.green.bold(data.project)
  )

  if (plugins.length) {
    console.log(c.bold(`🔌 Installing plugins...`))
    await installPlugins(plugins, pluginConfig, path.resolve(data.project))
  }

  console.log(
    c.bold(`✨ Your new Gatsby site is ready! Start developing it by running:`)
  )
  console.log(`
    cd ${data.project}
    gatsby develop
  `)
}