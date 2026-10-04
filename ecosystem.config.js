module.exports = {
  apps : [{
    name: "old-studio-bot",
    script: "./index.js",
    watch: false,
    autorestart: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    env: {
      NODE_ENV: "production",
    }
  }]
};
