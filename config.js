var SITE_ROOT_URL='http://telvoym.azurewebsites.net';
var THREAD_SITE_URL='http://telvoy.azurewebsites.net'
var IS_DEBUG_MODE=false;
var MONGO_CONNECTION_STRING = "mongodb://Telvoy_MongoDb:ZFj.UBl7MvdIsyR4AVOFQVWXAhDSM078Uhc8SRs6.LA-@ds030607.mongolab.com:30607/Telvoy_MongoDb";



//Imap server

var PULL_EMAIL_ID ="confme@ext.movial.com";
var PULL_EMAIL_PASS="aivohyiey0iePh";
var PULL_EMAIL_SERVER="imap.gmail.com";
var PULL_EMAIL_SERVER_PORT=993;
var PULL_EMAIL_SERVER_SECURE=true;

/*
var PULL_EMAIL_ID ='esydomain\\telvoytest1';
var PULL_EMAIL_PASS="Telvo123!@";
var PULL_EMAIL_SERVER="mail.esydomain.com";
var PULL_EMAIL_SERVER_PORT=143;
var PULL_EMAIL_SERVER_SECURE=false;
*/

//console.log(PULL_EMAIL_ID);
var EMAIL_PULL_CRITERIA='UNSEEN';
var PULL_EMAIL_DURATION=60*1000; // in millisecond
var NOTIFICATION_DURATION=1*60*1000; // in millisecond

var SMTP_HOST="smtpa.mpoli.fi";
var SMTP_PORT=465;
var SMTP_SSL=true;
var SMTP_USER="nstest@mpoli.fi";
var SMTP_PASS="fa30lGaeD";
var MAIL_SENT_FROM="info@telvoy.com"

var NOT_WHITELISTED_EMAIL_SUBJECT='Your Mail ID is not found in white list.';
var NOT_WHITELISTED_EMAIL_BODY='Sorry, we are unable to process the email. Please contact sales@telvoy.com';
var ATTENDEE_EMAIL_SUBJECT='Your Meeting Schedule is Parsed Successfully';
var ATTENDEE_EMAIL_BODY='Your Meeting Schedule is Parsed Successfully';

var EMAIL_ADDRESS_CONFIRMATION_SUBJECT='Telvoy : Confirm your whitelisted email address';
var EMAIL_ADDRESS_CONFIRMATION_BODY='To Confirm Click the link\n [LINK] \n copy the link and paste it in address bar of any browser then enter.';


exports.SITE_ROOT_URL=SITE_ROOT_URL;
exports.THREAD_SITE_URL=THREAD_SITE_URL;
exports.IS_DEBUG_MODE=IS_DEBUG_MODE;
exports.PULL_EMAIL_ID=PULL_EMAIL_ID;
exports.PULL_EMAIL_PASS=PULL_EMAIL_PASS;
exports.PULL_EMAIL_SERVER=PULL_EMAIL_SERVER;
exports.PULL_EMAIL_SERVER_PORT=PULL_EMAIL_SERVER_PORT;
exports.PULL_EMAIL_SERVER_SECURE=PULL_EMAIL_SERVER_SECURE;
exports.EMAIL_PULL_CRITERIA=EMAIL_PULL_CRITERIA;
exports.PULL_EMAIL_DURATION=PULL_EMAIL_DURATION;
exports.NOTIFICATION_DURATION=NOTIFICATION_DURATION;

exports.SMTP_HOST=SMTP_HOST;
exports.SMTP_PORT=SMTP_PORT;
exports.SMTP_SSL=SMTP_SSL;
exports.SMTP_USER=SMTP_USER;
exports.SMTP_PASS=SMTP_PASS;
exports.MAIL_SENT_FROM=MAIL_SENT_FROM;
exports.NOT_WHITELISTED_EMAIL_SUBJECT=NOT_WHITELISTED_EMAIL_SUBJECT;
exports.NOT_WHITELISTED_EMAIL_BODY=NOT_WHITELISTED_EMAIL_BODY;
exports.ATTENDEE_EMAIL_SUBJECT=ATTENDEE_EMAIL_SUBJECT;
exports.ATTENDEE_EMAIL_BODY=ATTENDEE_EMAIL_BODY;
exports.EMAIL_ADDRESS_CONFIRMATION_SUBJECT=EMAIL_ADDRESS_CONFIRMATION_SUBJECT;
exports.EMAIL_ADDRESS_CONFIRMATION_BODY=EMAIL_ADDRESS_CONFIRMATION_BODY;

exports.MONGO_CONNECTION_STRING = MONGO_CONNECTION_STRING;
