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


/* Method to send/push notification to MPNS. 
MPNS push tile to Phone Device if The Device is connected to MPNS linked by Live account */
function PushNotification(connection, notificationRemainderTime)
{
  if(connection == null) {
      utility.log('database connection is null','ERROR');
      return;
  }

  var Invitations = connection.collection('Invitations');
  var Invitees = connection.collection('Invitees');
  var Registrations = connection.collection('Registrations');

  var sttime = addMinutes(new Date(), 0);
  //console.log(sttime);
  // var edtime = addMinutes(new Date(), notificationRemainderTime/(1000*60));
  var edtime = addMinutes(new Date(), (24*60));
  //console.log(edtime);
  var invtime = {
    InvTime: {
      $gte: sttime,
      $lte: edtime
    }
  }

  // Registrations.find(function(error, reg) {
  //     console.log(reg.UserID);
  // })
 
  Invitations.find(invtime).toArray( function(error, invites) {
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
        // var pushInfo = [];
        var toEmailsString = '';
        invites.forEach(function(inv,i){
              // console.log("--------Invitations-------");
              // console.log(inv.Subject);
              var toEmails = inv.ToEmails.split(',');
              toEmailsString += inv.ToEmails.trim() + ','

              toEmails.forEach(function(te, i){

                  // Registrations.find({UserID: { $ne: te.trim() } }, function(error, reg) {
                  //     console.log(reg.UserID);
                  // })
                
                  Registrations.findOne({UserID: te.trim()}, function(error, registrations) {
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
                            console.log( inv.Subject + " ==== " + te);
                            // var RemainderMinute = registrations.RemainderMinute;
                            // var md = minutesDiff( inv.InvTime,new Date());
                            // if(md<=50){
                                // utility.log("Remainder Time for " + te + " is " + RemainderMinute + " minutes");
                                // utility.log("meeting " + inv.Subject + " of " + te + " remaining minute: " + md);

                                // if(md <= RemainderMinute && RemainderMinute > -1 ){
                                // var tileObj = {
                                //   'title' : '', // inv.Subject,
                                //   'backTitle' : moment(inv.InvTime).date() == moment().date() ? 'Today' : 'Tomorrow', // "Next Conference",
                                //   'backBackgroundImage' : "/Assets/Tiles/BackTileBackground.png",
                                //   'backContent' : inv.Subject + '\n' + moment(inv.InvTime).format('hh:mm A')  //inv.Agenda+"("+md+" minutes remaining)"
                                // };
                                var invSubject = inv.Subject.substring(0, 20) + '...';
                                var backHeader = moment(inv.InvTime).date() == moment().date() ? 'TODAY ' : 'TOMORROW ';
                                var meetingTime = moment(inv.InvTime.toISOString()).format('hh:mm A');
                                var tileObj = {
                                  'title' : '', // inv.Subject,
                                  'backTitle' : 'Telvoy', // "Next Conference",
                                  'backBackgroundImage' : "/Assets/Tiles/BackTileBackground.png",
                                  'backContent' : backHeader + '\n' + invSubject + '\n' + meetingTime  //inv.Agenda+"("+md+" minutes remaining)"
                                };
                                mpns.sendTile(registrations.Handle, tileObj, function(){
                                  utility.log('Pushed to ' + te + " for " + inv.Subject);
                                });
                            //   }
                            // }
                          }
                          else {
                            utility.log("Can't find push URL for " + te + ". so can't push notification.",'WARNING');
                          }
                      }
                  });
              });
                // Registrations.findOne({UserID: att.UserID.trim()}, function(error, registrations) {
                //   if(error)
                //   {
                //     utility.log("find registration error: " + error, 'ERROR');
                //   }
                //   else
                //   {
                //     if(debug==true)
                //     {
                //     utility.log('Invitees Push URL Info' );
                //     utility.log(registrations);
                //     }
                //     // console.log("Inv ID: "+invites[i]._id);
                //     // console.log(invitees[j]);
                //     // console.log(registrations); RemainderMinute
                //     if(registrations != null)
                //     {
                //       // console.log(inv);
                //       var RemainderMinute = registrations.RemainderMinute;
                //       var md = minutesDiff( inv.InvTime,new Date());
                //       if(md<=50){
                //           utility.log("Remainder Time for "+att.UserID +" is "+RemainderMinute+" minutes");
                //           utility.log("meeting "+inv.Subject+" of "+att.UserID+" remaining minute: "+md);

                //           if(md <= RemainderMinute && RemainderMinute > -1 ){
                //               //pushInfo["PushUrl"] = registrations.Handle;
                //               var tileObj = {
                //                         'title' : '', // inv.Subject,
                //                         'backTitle' : moment(inv.InvTime).date() == moment().date() ? 'Today' : 'Tomorrow', // "Next Conference",
                //                         'backBackgroundImage' : "/Assets/Tiles/BackTileBackground.png",
                //                         'backContent' : inv.Subject + '\n' + moment(inv.InvTime).format('hh:mm A')  //inv.Agenda+"("+md+" minutes remaining)"
                //                         };
                //               mpns.sendTile(registrations.Handle, tileObj, function(){utility.log('Pushed to ' + att.UserID + " for " + inv.Subject);});
                //           }
                //       }
                //     } 
                //     // else {
                //     //   pushInfo["PushUrl"] =null;
                //     //   utility.log("Can't find push URL for "+pushInfo["UserID"]+" . so can't push notification.",'WARNING');
                //     // }
                //     // console.log(pushInfo);
                //   }
                // });
          //     });
          //   }
          // });

        });

        var toEmailsArray = toEmailsString.split(',');

        Registrations.find({ UserID: { $nin: toEmailsArray } }).toArray(function(error, regs) {
          // console.log(regs.length);
          if(error)
          {
              utility.log("Find registration error: " + error, 'ERROR');
          }
          else
          {
              if(debug == true)
              {
                  utility.log('Registration Push URL Info' );
                  utility.log(regs);
              }
              regs.forEach(function(reg, i){
                  // console.log(reg.UserID);
                  var tileObj = {
                    'title' : null,
                    'backTitle' : null,
                    'backBackgroundImage' : "",
                    'backContent' : null
                  };
                  // mpns.sendTile(reg.Handle, tileObj, function(){
                  //   // utility.log('Pushed null to ' + reg.UserID + " for tile");
                  // });
              });
          }
        });

        //return JSON.stringify(result);
        // response.setHeader("content-type", "text/plain";
        // response.write("{\"Tolls\":" + JSON.stringify(result.Toll) + "}";
        // response.end();
      }
    });

}



/* Exposes all methods to call outsite this file, using its object */
exports.insertInvitationEntity=insertInvitationEntity;
exports.PushNotification=PushNotification;
exports.ProcessInvitees=ProcessInvitees;
