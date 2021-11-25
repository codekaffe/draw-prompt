require('dotenv').config();
const { Client, Intents, Collection, MessageActionRow, MessageButton } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { createServer, getReqData } = require('./http');

const PORT = process.env.PORT || 8080;

const bot = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

const prompts = new Collection();

bot.on('ready', () => {
  console.log(`${bot.user.tag} is ready to roll!`);
});

bot.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!draw')) {
    const promptId = `${message.author.id}-${message.id}`;

    await message.channel.send({
      content: 'Draw me a nice selfie!',
      components: [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setURL(
              `http://localhost:${PORT}/draw?q=${promptId}&t=${message.guild.id}-${message.channel.id}`,
            )
            .setStyle('LINK')
            .setLabel('Go Draw')
            .setEmoji('🖼'),
        ),
      ],
    });

    prompts.set(promptId, async (colors) => {
      await message.channel.send(`${message.author}, thank you for drawing!`);
      let msg = '';
      for (let i = 0; i < colors.length; i++) {
        if (colors[i] === '#a0293d') {
          msg += '🟥';
        } else if (colors[i] === '#296aa0') {
          msg += '🟦';
        } else {
          msg += '⬛';
        }
        if ((i + 1) % Math.sqrt(colors.length) === 0) {
          msg += '\n';
        }
      }
      const sentArt = await message.channel.send(msg);
      await sentArt.react('♥');
    });
  }
});

const httpServer = createServer(PORT, async (req, res) => {
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
    return;
  }
  const body = await getReqData(req);
  res.writeHead(200);
  res.end();

  if (body?.promptId) {
    const prompt = prompts.get(body.promptId);
    if (prompt) {
      prompts.delete(body.promptId);
      await prompt(body.colors);
    }
  }
});

bot.login(process.env.DISCORD_TOKEN);
