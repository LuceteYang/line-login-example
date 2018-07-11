var express = require('express');
var router = express.Router();
const crypto = require("crypto");
const channel_id = process.env.channel_id;
const callback_url = process.env.callback_url;
const channel_secret = process.env.channel_secret;
/* GET home page. */
router.get('/', (req, res, next) =>{
  res.render('index', { title: 'Express', info: '' });
});

router.get('/auth',(req,res,next)=>{
    let url = make_auth_url();
    return res.redirect(url);
})

router.get("/callback",(req, res, next) => {
    const code = req.query.code;
    const state = req.query.state;
    const friendship_status_changed = req.query.friendship_status_changed;

    if (!code){
        console.log("Authorization failed.");
        return res.status(400).json({error:"Authorization failed."});
    }
    if (!secure_compare(req.session.line_login_state, state)){
        console.log("Authorization failed. State does not match.");
        return res.status(400).json({error:"Authorization failed. State does not match."});
    }
    console.log("Authorization succeeded.");

    this.issue_access_token(code).then((token_response) => {
        if (this.verify_id_token && token_response.id_token){
            let decoded_id_token;
            try {
                decoded_id_token = jwt.verify(
                    token_response.id_token,
                    this.channel_secret,
                    {
                        audience: this.channel_id,
                        issuer: "https://access.line.me",
                        algorithms: ["HS256"]
                    }
                );
                if (!secure_compare(decoded_id_token.nonce, req.session.line_login_nonce)){
                    throw new Error("Nonce does not match.");
                }
                console.log("id token verification succeeded.");
                token_response.id_token = decoded_id_token;
            } catch(exception) {
                console.log('line 60 ',"id token verification failed.");
				res.status(400).json({error:"id token verification failed."});
            }
        }
        res.render('index', { title: 'Express', info: token_response });
    }).catch((error) => {
        console.log('line 66 ',error);
        res.status(400).json(error);
    });
});
issue_access_token(code){
    const url = `https://api.line.me/oauth2/${api_version}/token`;
    const form = {
        grant_type: "authorization_code",
        code: code,
        redirect_uri: callback_url,
        client_id: channel_id,
        client_secret: channel_secret
    }
    return request.postAsync({
        url: url,
        form: form
    }).then((response) => {
        if (response.statusCode == 200){
            return JSON.parse(response.body);
        }
        return Promise.reject(new Error(response.statusMessage));
    });
}


make_auth_url(){
    const client_id = encodeURIComponent(channel_id);
    const redirect_uri = encodeURIComponent(callback_url);
    const scope = encodeURIComponent("profile openid");
    const bot_prompt = encodeURIComponent("normal");
    const state = crypto.randomBytes(20).toString('hex');
    const nonce = crypto.randomBytes(20).toString('hex');
    let url = `https://access.line.me/oauth2/${api_version}/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}&bot_prompt=${bot_prompt}&state=${state}`;
    return url
}

module.exports = router;
