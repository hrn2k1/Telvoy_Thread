var config = require('./config.js');
var utility=require('./utility.js');
var debug = config.IS_DEBUG_MODE;
var nodemailer = require("nodemailer");
function sendMail(subject,msg,recipients)
{
    
    var smtp={
            host: config.SMTP_HOST,
            port: config.SMTP_PORT,
            secureConnection: config.SMTP_SSL,
            //authentication: "login",
            auth: {
                user: config.SMTP_USER,
                pass: config.SMTP_PASS
            }
        };


        var smtpTransport = nodemailer.createTransport("SMTP",smtp);
        if(debug==true){
		utility.log('SMTP Setting');
		utility.log(smtp);
	}
		utility.log('Email Sending Result/Error');
		// setup e-mail data with unicode symbols
		var mailOptions = {
		    from: config.MAIL_SENT_FROM, // sender address
		    to: recipients,
		    subject: subject, // Subject line
		    text: msg //, // plaintext body
		    //b: "<b>Hello world </b>" // html body
		};
		 if(debug==true){
	        utility.log('Mail Object to send');
	        utility.log(mailOptions);
    	}
		// send mail with defined transport object
		smtpTransport.sendMail(mailOptions, function(error, response){
		    if(error){
		        utility.log('Can\'t send '+error,'ERROR');
		    }else{
		        utility.log("Message sent to "+ recipients +" : " + response.message);
		    }
           smtpTransport.close(); // close the pool
		   
		});
		
    
}

exports.sendMail=sendMail;
