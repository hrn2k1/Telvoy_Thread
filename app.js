var Imap = require('imap');
var MailParser = require('mailparser').MailParser;
var fs = require('fs');
var inspect = require('util').inspect;
var config = require('./config.js');
var dao=require('./dataaccess.js');
var utility=require('./utility.js');
var mimelib = require("mimelib-noiconv");
var parser=require('./parser.js');

// var isUser = {}
// var urlRegExp = new RegExp('https?://[-!*\'();:@&=+$,/?#\\[\\]A-Za-z0-9_.~%]+');

//var mpns = require('mpns');

var http = require("http");
var url = require("url");
var MongoClient = require('mongodb').MongoClient;
var mongo = require('mongodb');

var debug = config.IS_DEBUG_MODE;
var markSeen = true;
var PARSE_RES = { "fetch" : "empty", "fetchMessage" : "Cold start, fetching in progress..."};

var imap = new Imap({
    user: config.PULL_EMAIL_ID,
    password: config.PULL_EMAIL_PASS,
    host: config.PULL_EMAIL_SERVER,
    port: config.PULL_EMAIL_SERVER_PORT,
    secure: config.PULL_EMAIL_SERVER_SECURE,
    tls: config.PULL_EMAIL_SERVER_SECURE,
    tlsOptions: { rejectUnauthorized: false }
});

var dbConnection;
if(debug==true)
{
  utility.log('IMAP Info:');
  utility.log(imap);
}

process.on('uncaughtException', function (err) {
    //fs.writeFile("test.txt",  err, "utf8");  
     fs.appendFile("threaderrorlog.txt", (new Date()).toISOString()+'>>'+ err+"  ", "utf8");   
});


http.createServer(function(request, response) {
    var uri = url.parse(request.url).pathname;

    if(debug==true)
    {
        utility.log('Requested URL: '+request.url);
        utility.log('Requested Query String: '+ url.parse(request.url).query);
    }
    if(uri.toLowerCase()=="/ping")
    {
              //utility.log('Showing Configuration Settings');
              response.setHeader("content-type", "text/plain");
              response.write("OK");
              response.end();
    }
    else if(uri.toLowerCase()=="/config")
    {
              utility.log('Showing Configuration Settings');
              response.setHeader("content-type", "text/plain");
              response.write(JSON.stringify(config));
              response.end();
    }
    else if(uri.toLowerCase()=="/log")
    {
        fs.readFile("../../LogFiles/Application/index.html" ,function(error,data){
            if(error){
               response.writeHead(404,{"Content-type":"text/plain"});
               response.end("Sorry the page was not found"+error);
            }else{
               response.writeHead(202,{"Content-type":"text/html"});
               response.end(data);

            }
        });
    }
    else if(RightString(uri,3).toLowerCase()=="txt"){
         //console.log(RightString(uri,3));
         fs.readFile("../../LogFiles/Application"+uri ,function(error,data){
       if(error){
           response.writeHead(404,{"Content-type":"text/plain"});
           response.end("Sorry the page was not found"+error);
       }else{
           response.writeHead(202,{"Content-type":"text/plain"});
           response.end(data);

       }
        });
    }
    else if(RightString(uri,4).toLowerCase()==".log"){
         //console.log(RightString(uri,3));
         fs.readFile(__dirname+uri ,function(error,data){
       if(error){
           response.writeHead(404,{"Content-type":"text/plain"});
           response.end("Sorry the page was not found"+error);
       }else{
           response.writeHead(202,{"Content-type":"text/plain"});
           response.end(data);

       }
        });
    }
    else {
        response.setHeader("content-type", "text/plain");
        response.write(JSON.stringify(url.parse(request.url)));
        response.end();
    }
}).listen(process.env.port || 8181);


 
function RightString(str, n){
        if (n <= 0)
        return "";
        else if (n > String(str).length)
        return str;
        else {
        var intLen = String(str).length;
        return String(str).substring(intLen, intLen - n);
            }
}
function sleep(delay) {
        var start = new Date().getTime();
        while (new Date().getTime() < start + delay);
      }
var duration=config.PULL_EMAIL_DURATION;
var NotificationRemainderDuration=config.NOTIFICATION_DURATION;

//console.log(duration);
// while(true){
// checkMails();
// sleep(5000);
// }
mongo.MongoClient.connect(config.MONGO_CONNECTION_STRING, function(err, connection) {
   if(err) {
      utility.log('database connection error: '+err,'ERROR');
    dbConnection=null;
  }
  else
  {
        dbConnection=connection;
        checkMails();
        setInterval(function() {
        utility.log('Pulling Invitation..');
        checkMails();
        }, duration);

        utility.log(NotificationRemainderDuration);

        SendEligibleNotifications();
        setInterval(function(){
        //utility.log('Sending Notification...');
        SendEligibleNotifications();
        },NotificationRemainderDuration-100);

 }
});

function SendEligibleNotifications(){
     utility.log('Sending Notification...');
    dao.PushNotification(dbConnection,NotificationRemainderDuration);
}
function checkMails() {
    /*console.log(imap);*/
    utility.log('Connecting imap');
    imap.setMaxListeners(0);
     //console.log('Connecting imap...');
   /* imap.once('error', function(err) {
  console.log(err);
    });*/
    imap.connect(function(err) {
        if (err) {
            PARSE_RES['fetchMessage'] = 'Unable to connect imap: ' + err;
            utility.log('Unable to connect imap '+err,'ERROR');
            return;
        }
        
        utility.log('Connected imap');
        
        imap.openBox('INBOX', false, function(err, mailbox) {
            if (err) {
                PARSE_RES['fetchMessage'] = 'Unable to open inbox: ' + err;
                utility.log(PARSE_RES['fetchMessage'],'ERROR');
                imap.logout();
                return;
            }

            imap.search([ config.EMAIL_PULL_CRITERIA, ['SINCE', 'June 01, 2013'] ], function(err, results) {
                if(debug==true)
                utility.log('IMAP Search '+'Error:'+inspect(err, false, Infinity)+' Results:'+inspect(results, false, Infinity),'GENERAL');
                
                if (err) {
                    PARSE_RES['fetchMessage'] = 'Cannot search inbox: ' + err;
                    utility.log(PARSE_RES['fetchMessage'],'ERROR');
                    imap.logout();
                    return;
                }

                if ( !results || results.length <= 0 ) {
                    PARSE_RES['fetchMessage'] = 'No new mail';
                    utility.log(PARSE_RES['fetchMessage']);
                    imap.logout();
                    return;
                }
                
                imap.fetch(results, { markSeen: markSeen }, { headers: { parse: false }, body: true, cb: fetchMailProcess}, fetchMailDone);
            });
        });
    });
}


function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}
function getForwader(mail){

  if(mail.from !=null && mail.from !=null && mail.from!='undefined' && mail.from.length>0)
    return mail.from[0].address;
  else
      return null;
}
function fetchMailProcess(fetch) {
    fetch.on('message', function(msg) {
        utility.log('BEGIN SeqNo:'+msg.seqno);
        mailParser = new MailParser();

        mailParser.on('end', function(mail) {
            var out = parser.parseMail(mail);
            if (!out)
            {
                utility.log('Cannot Parse mail');
                return;
            }
                

            out['fetch'] = "success";
            PARSE_RES = out;
            var addressStr = replaceAll(';', ',', out['to']); //'jack@smart.com, "Development, Business" <bizdev@smart.com>';
            addressStr=replaceAll('mailto:', '', addressStr.toLowerCase());
            var addresses = mimelib.parseAddresses(addressStr);
            if(out['from'] !=null && out['from'] !='')
            {
              var fromss=out['from'];
              formss=replaceAll(';', ',', fromss);
              formss=replaceAll('mailto:', '', formss.toLowerCase());
              var froms=mimelib.parseAddresses(formss);
              if(froms.length>0){
              var fromAttendee={"address":froms[0].address,"name":froms[0].name};
              addresses.push(fromAttendee);
            }
            }
            utility.log('No. of Attendees :'+ addresses.length);
            utility.log('Starting Invitation Save into mongodb database...');
            var emailsto='';
        if(addresses.length>0)
         {
                
            for (var i =0; i<addresses.length; i++) {
                if(i >0) emailsto =emailsto +",";
                emailsto = emailsto+ addresses[i].address;
                
            //console.log(addresses[i].address);
            //console.log(addresses[i].name);
            }
        }
        else
        {
            emailsto='';
            //console.log('receipent not found');
            //console.log(utility.convertToDateTime(utility.Nullify(out['date']),utility.Nullify(out['time'])));
        /*var entity = {
                UserID : '',
                ToEmail:'',
                FromEmail: utility.isNull(out['from'],''),
                InvDate : new Date(Date.parse(utility.isNull(out['date'],''))),
                InvTime : utility.convertToDateTime(utility.isNull(out['date'],''),utility.isNull(out['time'],'')),
                Subject: utility.isNull(out['subject'],''),
                Toll:utility.isNull(out['toll'],''),
                PIN: utility.isNull(out['pin'],''),
                AccessCode: utility.isNull(out['code'],''),
                Password: utility.isNull(out['password'],''),
                DialInProvider:'WebEx'
                };
                //console.log(entity);
                 dao.insertInvitationEntity(entity);*/
        }
         utility.log(addresses);
         utility.log('EmailsTo: '+emailsto);
         var entity = {
                ToEmails : emailsto,
                FromEmail: utility.isNull(out['from'],''),
                Forwarder: utility.isNull(getForwader(mail),''),
                InvDate : utility.convertToDate(utility.isNull(out['date'],'')), // new Date(Date.parse(utility.isNull(out['date'],''))),
                InvTime : utility.convertToDateTime(utility.isNull(out['date'],''),utility.isNull(out['time'],'')),
                EndTime: utility.isNull(out['endtime'],''),
                Subject: utility.isNull(out['subject'],'').replace('FW: ',''),
                Toll:utility.isNull(out['toll'],''),
                PIN: utility.isNull(out['pin'],''),
                AccessCode: utility.isNull(out['code'],''),
                Password: utility.isNull(out['password'],''),
                DialInProvider: utility.isNull(out['provider'],''),
                TimeStamp: new Date(),
                Agenda:utility.isNull(out['agenda'],''),
                MessageID:utility.isNull(out['messageId'],'')
                };
        utility.log("invitation entity to insert");
        utility.log(entity);
         dao.insertInvitationEntity(dbConnection,entity,addresses,out['tolls']);

           //console.log('End Invitation Save into sql database');
            //sendPushNotification(out);
        });

        msg.on('data', function(data) {
            //console.log('data:'+data.toString('utf8'));
            mailParser.write(data.toString());
        });

        msg.on('end', function() {
            utility.log('END SeqNo:'+msg.seqno);
            mailParser.end();
        });
    });

    fetch.on('error', function(error) {
        utility.log(error,'ERROR');
    });
}

function fetchMailDone(err) {
    if (err) {
        utility.log('Mail fetching failed:'+err,'ERROR');
    }
    
    utility.log('Mail fetching completed');
    imap.logout();
}
