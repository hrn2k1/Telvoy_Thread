var mpns = require('mpns');
var config=require('./config.js');
var utility=require('./utility.js');
var moment = require('moment');
var mailer= require('./mailsender.js');

var debug = config.IS_DEBUG_MODE;

/*function to a string with another string*/
function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

function SendToastNotification(connection, userID, boldText, normalText, callback){
  if(connection == null) {
      utility.log('database connection is null','ERROR');
      return;
  }
  var Registrations = connection.collection('Registrations');
      Registrations.findOne({UserID: userID.trim()}, function(error, registration) {
          if(error)
          {
            utility.log("find registration error: " + error, 'ERROR');
          }
          else
          {
            // if(debug==true)
            // {
            utility.log('Invitees Push URL Info for sending Toast. User: ' + userID );
            utility.log(registration);
            // }
            if(registration != null)
            {
              var pushUri = registration.Handle;
               mpns.sendToast(pushUri,boldText,normalText,function(error,result){
                if(error){
                    utility.log("Can't Send Toast to User " + userID + " Error:"); 
                    utility.log(error);
                }
                else{
                   utility.log('Successfully Sent Toast to User ' + userID + ' and result:');
                   utility.log(result); 
                }
                if(callback != null)
                  callback(error,result);
            });
            }
          }
        });
}

/*Recurssive Method to handle Invitees. 
Due to IO non-blocking feature of Node.js normal looping is not applicable here*/
function ProcessInvitees(dbConnection, addresses, mailSubject, callback){

  if(dbConnection==null) {
      utility.log('database connection is null','ERROR');
     
      return;
  }
  var Atts=[];
  var EmailAddresses = dbConnection.collection('EmailAddresses');
  addresses.forEach(function(addr,j){
      EmailAddresses.findOne({EmailID: addr.address,Verified:true}, function(error, result1){
      //EmailAddresses.findOne({EmailID: addr.address}, function(error, result1){
          if(!error){
            if(result1==null){
              utility.log(addr.address+' not found in white list');
                //send email
              mailer.sendMail(config.NOT_WHITELISTED_EMAIL_SUBJECT,config.NOT_WHITELISTED_EMAIL_BODY,addr.address);
              if(j+1==addresses.length)
               {
                if(callback !=null) callback(null,Atts);
               }
              }
            else{
               Atts.push( {"UserID": result1.UserID,"EmailID": result1.EmailID} );
                //console.log(j,Atts);
               var attendeeEmailSubject = 'Telvoy: Invitation "' + mailSubject + '" parsed.';
               var attendeeEmailBody = 'Your meeting schedule with given subject "' + mailSubject + '" has been parsed successfully.';
               // console.log(attendeeEmailSubject);
               mailer.sendMail(attendeeEmailSubject, attendeeEmailBody,result1.EmailID);
               utility.log('Parsed Success email sent to ' + result1.EmailID);
               SendToastNotification(dbConnection,result1.UserID,attendeeEmailSubject,attendeeEmailBody,null);
               if(j+1==addresses.length)
               {
                if(callback !=null) callback(null,Atts);
               }
            }
          }
            else{
              if(callback !=null) callback(error,null);
            }
      });
});


}


/* Some Invitation mail body contains toll/dial in numbers with a few country list.
This Method is to store them into MeetingTolls Collection*/
function InsertMeetingTolls(connection,localtolls){
  
  if(localtolls==null) return;
  if(localtolls.length==0) return;
  utility.log("Meeting Tolls to insert");
  utility.log(localtolls);
  if(connection==null) {
      utility.log('database connection is null','ERROR');
     
      return;
  }
      var Tolls = connection.collection('MeetingTolls');
      Tolls.insert(localtolls,function(err,rslt){
          if(err){
            utility.log('Insert MeetingTolls Error: '+err,'ERROR');
             
          }
          else{
            utility.log("Successfully Inserted "+localtolls.length+" Meeting Tolls.");
             
          }
      });
      

}
/*This Method is to Insert/Update Invitation. This is called after parsing the invitation mail.*/
function insertInvitationEntity(connection,entity,addresses,localtolls)
{
  
  if(entity.AccessCode=='' || entity.AccessCode==null || entity.AccessCode=='undefined' || entity.AccessCode==undefined )
  {
  utility.log('AccessCode is not found.');
  mailer.sendMail(config.PIN_NOT_FOUND_EMAIL_SUBJECT,config.PIN_NOT_FOUND_EMAIL_BODY,entity.Forwarder);
  return;
  }
  //console.log(entity.InvTime,entity.EndTime);
  if(entity.EndTime=="" || entity.EndTime==null || entity.EndTime=="undefined"){ 
  entity.EndTime= addMinutes(entity.InvTime,60); 
  utility.log("Empty EndTime. and added 1 hr to InvTime: ",entity.EndTime);
}

   if(localtolls!=null && localtolls.length>0){
    for (var i = 0; i < localtolls.length; i++) {
      localtolls[i].MeetingID=entity.AccessCode;
    };
   }

if(connection==null) {
      utility.log('database connection is null','ERROR');
     
      return;
  }
  var Invitations = connection.collection('Invitations');
  var EmailAddresses = connection.collection('EmailAddresses');

 EmailAddresses.findOne({"EmailID":entity.Forwarder,"Verified":true},function(senderError,sender){
 if(senderError){
  utility.log('Error in finding sender email in whitelist. Error: '+senderError,'ERROR');
  return;
 }
 else{
  if(sender==null){
    utility.log('Sender(Forwarder) Email address '+ entity.Forwarder +' is not found in whitelist.');
     mailer.sendMail(config.NOT_WHITELISTED_EMAIL_SUBJECT,config.NOT_WHITELISTED_EMAIL_BODY,entity.Forwarder);
    return;
  }
  else{
    utility.log('Sender(Forwarder) Email '+entity.Forwarder+' is found in whitelist with userID '+sender.UserID);
    //////////////////////Start Invitation Process/////////////
    var mailSubject = entity.Subject.replace('Fwd: ','');
    ProcessInvitees(connection,addresses,mailSubject,function(error,addrs){
      if(error){
        utility.log('ProcessInvitees error: '+error);
      }
      else{
        utility.log('Allowed Attendees...');
        utility.log(addrs);
        entity.Attendees=addrs;

        Invitations.findOne({"AccessCode": entity.AccessCode}, function(error, result_invite){
    if(error){
      utility.log("Error in find invitation with AccessCode to check duplicate" + error,'ERROR');
        
    } else{
      //console.log("Invitation  found nor" + result_invite);
        if(result_invite == null){
         Invitations.insert(entity, function(error, result) {
          if(error)
          {
            utility.log("insertInvitationEntity() error: " + error, 'ERROR');
             
          }
          else
          {
            utility.log('insert invitation result.........');
            utility.log(result);
            utility.log("Invitation inserted Successfully");
            
          }
        });
      }
      else{
        utility.log("Invitation already exist for AccessCode: "+result_invite.AccessCode);
        Invitations.update({"_id":result_invite._id}, {$set:entity}, function(error,result){
          if(error)
          {
            utility.log("update error in insertInvitationEntity() error: " + error, 'ERROR');
             
          }
          else
          {
            utility.log('update invitation result.........');
            utility.log(result);
            utility.log("Invitation updated Successfully");
            
          }
        });
      }
    }
  });


      }

    });
    

    //////////////////////End Invitation Process//////////////
  }
 }

 });
  


}
/*This is not used now*/
function InsertMeetingInvitees (EmailAddresses,Invitees,invID,addresses,i,callback) {
if(i<addresses.length){
  
   EmailAddresses.findOne({EmailID: addresses[i].address,Verified:true}, function(error, result1){
                if(!error){
                  if(result1==null){
                    utility.log(addresses[i].address+' not found in white list');
                      //send email
                     
                    mailer.sendMail(config.NOT_WHITELISTED_EMAIL_SUBJECT,config.NOT_WHITELISTED_EMAIL_BODY,addresses[i].address);
                    InsertMeetingInvitees(EmailAddresses,Invitees,invID,addresses,i+1,callback);
                  }
                  else{
                    //var userID = result1.UserID;
                    var entity = {
                    "UserID": result1.UserID,
                    "EmailID": result1.EmailID,
                    "Invitations_id": invID
                  };
                   utility.log('invitee object to insert');
                   utility.log(entity);
                  Invitees.insert(entity,function(e,r){
                    if(e){
                       utility.log("insert Invitee error: " + e, 'ERROR');
                       // 
                    }
                    else
                    {
                     mailer.sendMail(config.ATTENDEE_EMAIL_SUBJECT,config.ATTENDEE_EMAIL_BODY,result1.EmailID);
                     utility.log('Parsed Success email sent to '+result1.EmailID);
                     // 
                     InsertMeetingInvitees(EmailAddresses,Invitees,invID,addresses,i+1,callback);
                   }
                  });
                 
                    
                  }
                  
                }
              });
}
else{
  utility.log('EmailAddresses processed completed');
  if(callback !=null)
    callback();
}
  // body...
}

/*This is not used now*/
function insertInvitationEntity_back(connection,entity,addresses,localtolls)
{
  //console.log(entity.InvTime,entity.EndTime);
  if(entity.EndTime=="" || entity.EndTime==null || entity.EndTime=="undefined"){ 
  entity.EndTime= addMinutes(entity.InvTime,60); 
  utility.log("Empty EndTime. and added 1 hr to InvTime: ",entity.EndTime);
}

   if(localtolls!=null && localtolls.length>0){
    for (var i = 0; i < localtolls.length; i++) {
      localtolls[i].MeetingID=entity.AccessCode;
    };
   }

if(connection==null) {
      utility.log('database connection is null','ERROR');
      return;
  }
  var Invitations = connection.collection('Invitations');
  var Invitees = connection.collection('Invitees');
  var EmailAddresses = connection.collection('EmailAddresses');

 EmailAddresses.findOne({"EmailID":entity.Forwarder,"Verified":true},function(senderError,sender){
 if(senderError){
  utility.log('Error in finding sender email in whitelist','ERROR');
  return;
 }
 else{
  if(sender==null){
    utility.log('Sender(Forwarder) Email address '+ entity.Forwarder +' is not found in whitelist.');
     mailer.sendMail(config.NOT_WHITELISTED_EMAIL_SUBJECT,config.NOT_WHITELISTED_EMAIL_BODY,entity.Forwarder);
    return;
  }
  else{
    utility.log('Sender(Forwarder) Email '+entity.Forwarder+' is found in whitelist with userID '+sender.UserID);
    //////////////////////Start Invitation Process/////////////

    Invitations.findOne({"AccessCode": entity.AccessCode}, function(error, result_invite){
    if(error){
      utility.log("Error in find invitation with AccessCode to check duplicate" + error,'ERROR');
        
    } else{
      //console.log("Invitation  found nor" + result_invite);
        if(result_invite == null){
         Invitations.insert(entity, function(error, result) {
          if(error)
          {
            utility.log("insertInvitationEntity() error: " + error, 'ERROR');
             
          }
          else
          {
            utility.log('insert invitation result.........');
            utility.log(result);
            utility.log("Invitation inserted Successfully");
            InsertMeetingInvitees(EmailAddresses,Invitees,result[0]._id,addresses,0,function(){ InsertMeetingTolls(connection,localtolls);});
            //   
            
          }
        });
      }
      else{
        utility.log("Invitation already exist for AccessCode: "+result_invite.AccessCode);
        Invitations.update({"_id":result_invite._id}, {$set:entity}, function(error,result){
          if(error)
          {
            utility.log("update error in insertInvitationEntity() error: " + error, 'ERROR');
             
          }
          else
          {
            utility.log('update invitation result.........');
            utility.log(result);
            utility.log("Invitation updated Successfully");
            Invitees.remove({Invitations_id:result_invite._id},function(err,res){
              if(err){
              utility.log("delete error in insertInvitationEntity() error: " + error, 'ERROR');
               
              }
              else{
                utility.log('deleted all previous invitees.')
                 InsertMeetingInvitees(EmailAddresses,Invitees,result_invite._id,addresses,0,function(){ InsertMeetingTolls(connection,localtolls);});
              }
            });
           
            //   
            
          }
        });
      }
    }
  });

    //////////////////////End Invitation Process//////////////
  }
 }

 });
  


}


function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes*60000);
}
function minutesDiff(start, end){
  var diff = start.getTime() - end.getTime(); // this is a time in milliseconds
  return parseInt(diff/(1000*60));
}

///////////////////

function SaveTileInfo(connection,userID,subject,invTime,endTime,pushURL,count,tile,callback){
  if(connection == null) {
      utility.log('database connection is null','ERROR');
      return;
  }
   var TileInfo = connection.collection('TileInfo');
   var TileInfoObj={
    "UserID":userID,
    "InvSubject":subject,
    "InvTime":invTime,
    "EndTime":endTime,
    "PushURL":pushURL,
    "Count":count,
    "Tile":tile,
    "CDT": new Date(),
    "IsExpired":false
   };
    
   TileInfo.findOne({"UserID":userID},function(error,tile){
    if(error){utility.log('error in get TileInfo'+error); return;}
    if(tile==null)
    {
      TileInfo.insert(TileInfoObj,function(error,result){
        if(error){utility.log('error in insert TileInfo'+error); return;}
        if(callback !=null) callback(null,result);
      });
    }
    else{
      TileInfo.update({"UserID":userID,"InvTime":{$lt:invTime}},TileInfoObj,function(error,result){
         if(error){utility.log('error in update TileInfo'+error); return;}
         if(callback !=null) callback(null,result);
      });
    }
   });
}

/* Method to send/push notification to MPNS. 
MPNS push tile to Phone Device if The Device is connected to MPNS linked by Live account */
/*function PushNotification(connection, notificationRemainderTime)
{
  if(connection == null) {
      utility.log('database connection is null','ERROR');
      return;
  }

  var Invitations = connection.collection('Invitations');
  var Registrations = connection.collection('Registrations');

  // var sttime = addMinutes(new Date(), -(24*60));
  var sttime = addMinutes(new Date(), 0);
  var edtime = addMinutes(new Date(), (24*60));
  //console.log(edtime);
  var invtime = {
    InvTime: {
      $gte: sttime,
      $lte: edtime
    }
  }

  
  Invitations.find(invtime).sort({"InvTime":1}).toArray( function(error, invites) {
     //console.log(invites);
    if(error)
    {
      utility.log("find Invitations error: " + error, 'ERROR');
    }
    else
    {
      if(debug==true)
      {
          utility.log("eligible invitations for push");
          utility.log(invites);
      }
        invites.forEach(function(inv,i){
              // console.log("--------Invitations-------");
              // console.log(inv.Subject);
              var InvAttendees=inv.Attendees;
              utility.log('Attendees of Invitation '+inv.Subject);
              utility.log(InvAttendees);
             InvAttendees.forEach(function(att, i){
                
                Registrations.findOne({UserID: att.UserID}, function(error, registrations) {
                      if(error)
                      {
                          utility.log("find registration error: " + error, 'ERROR');
                      }
                      else
                      {
                        if(debug == true)
                          {
                            utility.log('Invitees Push URL Info' );
                            utility.log(registrations);
                          }
                          if(registrations != null)
                          {
                            //console.log( inv.Subject + " ==== " + att.UserID+" >>"+registrations.RemainderMinute);
                             var RemainderMinute = registrations.RemainderMinute;
                             var TZ=registrations.TimeZone==null || registrations.TimeZone=='undefined' || registrations.TimeZone==undefined ?0:registrations.TimeZone;
                             var md = minutesDiff( inv.InvTime,new Date());

                             if(md>=0 && md<=50){
                                utility.log("Remainder Time for " + att.UserID + " is " + RemainderMinute + " minutes"+" and TZ="+TZ);
                                 utility.log("meeting " + inv.Subject + " of " + att.UserID + " remaining minute: " + md );
                                }
                             if( md >=0 && md <= RemainderMinute && RemainderMinute > -1 ){  //within remainder time
                                 var invSubject = inv.Subject.length<=23?inv.Subject: inv.Subject.substring(0, 20) + '...';
                                 var InvSubjectLarge=inv.Subject.length<=46?inv.Subject: inv.Subject.substring(0, 43) + '...';
                                var backHeader = moment(inv.InvTime).date() == moment().date() ? 'TODAY ' : 'TOMORROW ';
                                var meetingTime = moment(inv.InvTime.toISOString()).add('minutes',TZ*60).format('hh:mm A');
                                utility.log('Local(client) Invitation Time: '+meetingTime);
                                var tileObj = {
                                  'title' : '', // inv.Subject,
                                  'backTitle' : 'TELVOY', // "Next Conference",
                                  //'backBackgroundImage' : "/Assets/Tiles/BackTileBackground.png",
                                  'backContent' : backHeader + '\n' + invSubject+ '\n'  + meetingTime  //inv.Agenda+"("+md+" minutes remaining)"
                                };
                                var flipTileObj={
                                  'title' : '', 
                                  'backTitle' : 'TELVOY',
                                  'backContent' : backHeader + '\n' + invSubject+ '\n'  + meetingTime,
                                  'wideBackContent': backHeader + '\n'+ InvSubjectLarge+ '\n'  + meetingTime,
                                  'backBackgroundImage':"Images/logoBackX336.png",
                                  'wideBackBackgroundImage':"Images/logoBackX691.png"
                                };
                                utility.debug('Tile Object to send');
                                utility.debug(tileObj);
                                 SaveTileInfo(connection,att.UserID,inv.Subject,inv.InvTime,inv.EndTime,registrations.Handle,0,flipTileObj,null);
                                
                                //mpns.sendTile(registrations.Handle, tileObj, function(){
                                mpns.sendFlipTile(registrations.Handle, flipTileObj, function(){
                                  utility.log('Pushed to ' + att.UserID + " for " + inv.Subject);
                                });
                              }
                               else if(md<0){  // if invitaion time expires then send empty tile to clear

                                var tileEmptyObj = {
                                'title' : null,
                                'backTitle' : null,
                                'backBackgroundImage' : "",
                                'backContent' : null,
                                'wideBackContent':null
                              };
                              
                             // mpns.sendTile(registrations.Handle, tileEmptyObj, function(){
                              mpns.sendFlipTile(registrations.Handle, tileEmptyObj, function(){
                                 utility.log('Pushed null to ' + att.UserID + " for tile");
                              });
                              }
                             
                          }
                          else {
                            utility.log("Can't find push URL for " + att.UserID + ". so can't push notification.",'WARNING');
                          }
                      }
                  });
              });
                

        });

        
      }
    });

}*/

/* Method to send/push notification to MPNS. 
MPNS push tile to Phone Device if The Device is connected to MPNS linked by Live account */
function PushNotification(connection, notificationRemainderTime)
{
  if(connection == null) {
      utility.log('database connection is null','ERROR');
      return;
  }

  var Invitations = connection.collection('Invitations');
  var Registrations = connection.collection('Registrations');

  var sttime = addMinutes(new Date(), 0);
  var edtime = addMinutes(new Date(), (24*60));
  //console.log(edtime);
  var invtime = {
    EndTime: {
      $gte: sttime,
      $lte: edtime
    }
  }
    var tiles = [];
    
 Invitations.find(invtime).sort({"InvTime":1}).toArray( function(error, invites) {
    // console.log(invites);

    if(error)
    {
      utility.log("find Invitations error: " + error, 'ERROR');
    }
    else
    {
      if(debug==true)
      {
          utility.log("eligible invitations for push");
          utility.log(invites);
      }
        invites.forEach(function(inv,i){
              var InvAttendees=inv.Attendees;
              utility.log('Attendees of Invitation '+inv.Subject);
              utility.log(InvAttendees);
                InvAttendees.forEach(function (att, i){
                   
                Registrations.findOne({UserID: att.UserID}, function(error, registrations) {
                      if(error)
                      {
                          utility.log("find registration error: " + error, 'ERROR');
                      }
                      else
                      {
                        if(debug == true)
                          {
                            utility.log('Invitees Push URL Info' );
                            utility.log(registrations);
                          }
                            if (registrations != null) {
                                sendTile(connection, att.UserID, registrations, function (error, result) {

                                });
                            }
                            else {
                                utility.log("User Registration not found for " + att.UserID);
                            }
                      }
                  });
              });
                

        });

        
      }
    });

}
function sendTile(connection,userID,objReg,callback) {
    if (connection == null) {
        utility.log('database connection is null', 'ERROR');
        return;
    }
    
    var Invitations = connection.collection('Invitations');
    
    Invitations.find({ EndTime : { $gte : new Date() }, Attendees : { $elemMatch : { UserID : userID } } }, { Attendees : 0 }).sort({ InvTime: 1 }).limit(1).toArray(
     function (error, result) {
        if (error) {
            utility.log("Invitations find for send tile error: " + error, 'ERROR');
            if (callback != null) callback(error, null);
        }
          else {
            utility.log("Recent Invitation for user " + userID);
            utility.log(result);
            var inv = null;
            if (result == null || result.length == 0)
                inv = null;
            else
                inv = result[0];

            var RemainderMinute = objReg.RemainderMinute;
            var TZ = objReg.TimeZone == null || objReg.TimeZone == 'undefined' || objReg.TimeZone == undefined ?0:objReg.TimeZone;
            var md = minutesDiff(inv.InvTime, new Date());
            if (RemainderMinute != -1 && md <= RemainderMinute) {
                //within remainder time
                var invSubject = inv.Subject.length <= 23?inv.Subject: inv.Subject.substring(0, 20) + '...';
                var InvSubjectLarge = inv.Subject.length <= 46?inv.Subject: inv.Subject.substring(0, 43) + '...';
                var backHeader = moment(inv.InvTime).date() == moment().date() ? 'TODAY ' : 'TOMORROW ';
                var meetingTime = moment(inv.InvTime.toISOString()).add('minutes', TZ * 60).format('hh:mm A');
                utility.log('Local(client) Invitation Time: ' + meetingTime);
                
                var flipTileObj = {
                    'title' : 'telvoy', 
                    'backTitle' : 'telvoy',
                    'backContent' : backHeader + '\n' + invSubject + '\n' + meetingTime,
                    'wideBackContent': backHeader + '\n' + InvSubjectLarge + '\n' + meetingTime,
                    'backBackgroundImage': "Images/logoBackX336.png",
                    'wideBackBackgroundImage': "Images/logoBackX691.png"
                };
                utility.debug('Tile Object to send');
                utility.debug(flipTileObj);
                mpns.sendFlipTile(objReg.Handle, flipTileObj, function (error, result) {
                    utility.log('Pushed Tile to ' + att.UserID + " for " + inv.Subject);
                    if (callback != null) callback(error, result);
                });
                
            }
            else if (md < 15) {
                var tileEmptyObj = {
                    'title' : 'telvoy',
                    'backTitle' : null,
                    'backBackgroundImage' : "",
                    'backContent' : null,
                    'wideBackContent': null
                };
                
                mpns.sendFlipTile(objReg.Handle, tileEmptyObj, function (error,result) {
                    utility.log('Pushed empty Tile to ' + att.UserID + " for " + inv.Subject);
                    if (callback != null) callback(error, result);
                });
            }
            else {
                utility.log("Can't find push URL for " + att.UserID + ". so can't push notification.", 'WARNING');
                var tileEmptyObj = {
                    'title' : 'telvoy',
                    'backTitle' : 'telvoy',
                    'backBackgroundImage' : "",
                    'backContent' : 'Forward Webex invitations to upcoming@telvoy.com',
                    'wideBackContent': 'Forward Webex invitations to upcoming@telvoy.com'
                };
                
                mpns.sendFlipTile(objReg.Handle, tileEmptyObj, function (error, result) {
                    utility.log('Pushed how to Tile to ' + att.UserID + " for " + inv.Subject);
                    if (callback != null) callback(error, result);
                });
            }
        }

    });

    
}

/* New Tile Pushing logic*/

function PushTiles(connection){

   if(connection == null) {
      utility.log('database connection is null','ERROR');
      return;
  }
  //utility.log('IN..........');
  var Invitations = connection.collection('Invitations');
  var Registrations = connection.collection('Registrations');

  Registrations.find().sort({TimeStamp:1}).toArray( function(error, regs) {

   if(error)
      {
          utility.log("find registrations error: " + error, 'ERROR');
      }
      else
      {
        if(debug == true)
          {
            utility.log('Invitees Push URL Info' );
            utility.log(regs);
          }

          regs.forEach(function (reg, i){

            var RemainderMinute = parseInt(reg.RemainderMinute)+1;
            var TZ = reg.TimeZone == null || reg.TimeZone == 'undefined' || reg.TimeZone == undefined ?0:parseInt(reg.TimeZone);
            var pURL=reg.Handle;

 if(pURL==null || pURL=='' || pURL=='undefined')
  {
     utility.log('Can not push Live Tile to ' + reg.UserID +" bcz: Push URL is empty.");
    
  }
  else
  {
/////////////////////

Invitations.find({ EndTime : { $gte : addMinutes(new Date(), -15) }, Attendees : { $elemMatch : { UserID : reg.UserID } } }, { Attendees : 0 }).sort({ InvTime: 1 }).limit(2).toArray(
     function (error, result) {
        if (error) {
            utility.log("Invitations find for send tile error: " + error, 'ERROR');
            //if (callback != null) callback(error, null);
        }
          else {
            utility.log("Recent Invitation for user " + reg.UserID);
            utility.log(result);
            var inv = null;
            var invNext = null;
            var mdd=15;
            if (result == null || result.length == 0)
                inv = null;
            else
                inv = result[0];
            if(result !=null && result.length >=2)
            {
            invNext=result[1];
             var nextRT=addMinutes(invNext.InvTime,-RemainderMinute);
              var md1=minutesDiff(nextRT,inv.EndTime);
              if(md1>0 && md1 <=15 )
              mdd=md1;
              else
              mdd=15;
            }
            else
            mdd=15;
              if(inv !=null && RemainderMinute !=-1 ){
                 var minutesDiffFromEnd=minutesDiff(inv.EndTime,new Date());
                 var ttlReminderMinutes= RemainderMinute+minutesDiff(inv.EndTime,inv.InvTime);

                 utility.log('minutesDiffFromEnd of UserID '+reg.UserID+' for '+ inv.Subject+ ': '+minutesDiffFromEnd);
                 utility.log('ttlReminderMinutes of UserID '+reg.UserID+' for '+ inv.Subject+ ': '+ttlReminderMinutes);
                 if( minutesDiffFromEnd>=-mdd && minutesDiffFromEnd <= ttlReminderMinutes)
                 {
                   sendMeetingTile(pURL,reg.UserID,inv,TZ);
                 }
                 else
                 {
                  sendBlankTile(pURL,reg.UserID);
                 }

              }
              else
                 {
                  sendBlankTile(pURL,reg.UserID);
                 }


              }

});
//////////////////
}


          });
      }

  });
    

}


function  sendBlankTile(pURL,userID)
{
  if(pURL==null || pURL=='' || pURL=='undefined')
  {
     utility.log('Can not push Blank Tile to ' + userID +" bcz: Push URL is empty");
     return;
  }

   var flipTileObj = {
                    'title' : 'telvoy',
                    'backTitle' : 'telvoy',
                    'backContent' : 'You currently have no conference calls...',
                    'wideBackContent': 'You currently have no conference calls scheduled. To populate the list please...',
                    'backBackgroundImage': "Images/logoBackX336.png",
                    'wideBackBackgroundImage': "Images/logoBackX691.png"
                };

    utility.debug('Blank Tile Object to send');
    utility.debug(flipTileObj);
    mpns.sendFlipTile(pURL, flipTileObj, function (error, result) {

      if(!error)
        utility.log('Pushed Blank Tile to ' + userID );
      else
        utility.log('Can not push Blank Tile to ' + userID +" Error: "+error);
        
    });
}

function sendMeetingTile(pURL,userID,inv,TZ)
{
  if(pURL==null || pURL=='' || pURL=='undefined')
  {
     utility.log('Can not push Tile to ' + userID +" bcz: Push URL is empty");
     return;
  }
  
  var invSubject = inv.Subject.length <= 23?inv.Subject: inv.Subject.substring(0, 20) + '...';
  var InvSubjectLarge = inv.Subject.length <= 40?inv.Subject: inv.Subject.substring(0, 37) + '...';
  var backHeader = moment(inv.InvTime).date() == moment().date() ? 'TODAY ' : 'TOMORROW ';
  var meetingTime = moment(inv.InvTime.toISOString()).add('minutes', TZ * 60).format('hh:mm A');
  utility.log('Local(client) Invitation Time of UserID '+userID+' for '+ inv.Subject+': ' + meetingTime);
   var flipTileObj = {
                    'title' : 'telvoy', 
                    'backTitle' : 'telvoy',
                    'backContent' : backHeader + '\n' + invSubject + '\n' + meetingTime,
                    'wideBackContent': backHeader + '\n' + InvSubjectLarge + '\n' + meetingTime,
                    'backBackgroundImage': "Images/logoBackX336.png",
                    'wideBackBackgroundImage': "Images/logoBackX691.png"
                };
    utility.debug('Tile Object to send');
    utility.debug(flipTileObj);
    mpns.sendFlipTile(pURL, flipTileObj, function (error, result) {

      if(!error)
        utility.log('Pushed Tile to ' + userID + " for " + inv.Subject);
      else
        utility.log('Can not push Tile to ' + userID + " for " + inv.Subject+" Error: "+error);
        
    });
}



/* Exposes all methods to call outsite this file, using its object */
exports.insertInvitationEntity=insertInvitationEntity;
exports.PushNotification=PushNotification;
exports.ProcessInvitees=ProcessInvitees;
exports.PushTiles=PushTiles;
