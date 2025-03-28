module.exports = {
  apps: [{
    name: "dmxserver",
    script: "server.js",
    watch: false,
    autorestart: true,
    autostart: true,
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm Z",
    env: {
      "NODE_ENV": "production"
    },
    error_file: "logs/dmxserver-error.log",
    out_file: "logs/dmxserver-out.log"
  }],

  deploy : {
    production : {
      user : 'SSH_USERNAME',
      host : 'SSH_HOSTMACHINE',
      ref  : 'origin/master',
      repo : 'GIT_REPOSITORY',
      path : 'DESTINATION_PATH',
      'pre-deploy-local': '',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
