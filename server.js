var express = require('express');
var request = require('request');
var path = require('path');
var fs = require("fs");
var bodyParser = require('body-parser');
var port = process.env.PORT || process.env.VCAP_APP_PORT || '8080';
var nano = require('nano')('http://localhost:'+port);var app = express();
var multer = require('multer');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var upload = multer({
    dest: __dirname + '/upload'
});
var type = upload.single('file');

app.use('/', express.static(__dirname + '/'));
app.use('/', express.static(__dirname + '/Images'));

var cloudantUserName = "97db821e-87a4-4507-b8ee-fcc95b72b447-bluemix";
var cloudantPassword = "ae34609f865eac5720a3e08c9c0208840a9418090a98f9a4c1fcb9fa5573040b";
var dbCredentials_url = "https://"+cloudantUserName+":"+cloudantPassword+"@"+cloudantUserName+".cloudant.com"; // Set this to your own account

// Initialize the library with my account.
var cloudant = require('cloudant')(dbCredentials_url);

var dbForLogin = cloudant.db.use("logindetails");
var dbForApplicantData = cloudant.db.use("applicantdata");
var dbForAdminRequestTable = cloudant.db.use("adminrequesttable");


// viewed at http://13.126.20.198:8081 To open the login page
app.get('/', function(req, res) {
    console.log("Open LoginPage.html page");
    res.sendFile(path.join(__dirname + '/LoginPage.html'));
});

//For authenticate the portal verification
app.post('/loginData', function(req, res) {
    console.log("Got a POST request for LoginPage.html page");
    var response = "";
    var userName = req.body.username;
    var password = req.body.password;
    dbForLogin.get(userName, function(err, body) {
        if (!err) {
            var dbPassword = body.agentPassword;
            if (dbPassword === password) {
                response = {
                    status: 200,
                    message: 'Success'
                }
            } else {
                response = {
                    status: 300,
                    message: 'Username and Password does not match'
                }
            }
        } else {
            console.log(err);
            response = {
                status: 400,
                message: 'Username does not exists'
            }
        }
        res.send(JSON.stringify(response));
    });
});

app.post('/requestTableData', function(req, res) {
    var response = "";
    console.log("Got an on-load POST request for RequestTable.html page");
    dbForAdminRequestTable.list({
        include_docs: true
    }, function(err, body) {
        if (!err) {
            console.log('Data is sent to the page.')
            response = {
                status: 200,
                message: body
            }
        } else {
            response = {
                status: 400,
                message: 'No data found.'
            }
        }
        res.send(JSON.stringify(response));
    })
});

app.post('/applicantData', function(req, res) {
    console.log("Got a POST request for RequestTable.html page");
    var userData = "";
    var response = "";
    dbForApplicantData.list({
        include_docs: true
    }, function(err, body) {
        if (!err) {
            for (var i = 0; i < body.rows.length; i++) {
                if (body.rows[i].id === req.body.id) {
                    userData = body.rows[i].doc;
                    //console.log(userData);
                }
            }
            response = {
                status: 200,
                message: userData
            }
        } else {
            response = {
                status: 400,
                message: 'No data found for this applicant.'
            }
        }
        res.send(JSON.stringify(response));
    })
});

//This is the place where need to put chaincode
app.post('/applicantDataStatus', function(req, res) {
    console.log("Got a POST request for StudentDetails.html page");
    var newstatus = req.body.status;
    var id = "";
    var revId = "";
    var digitalId = "";
    var requestDate = "";
    var applicantname = "";
    var token = "";

    //Call to chaincode

    console.log("Name :- " + req.body.name);
    // Set the headers
    var headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    console.log(headers);
    // Configure the request
    var options = {
        url: 'http://34.234.82.177:4000/users',
        method: 'POST',
        headers: headers,
        form: {
            'username': req.body.name,
            'orgName': 'agent'
        }
    }
    console.log(options);

    request(options, function(error, response, body) {
        //console.log(response);
        if (!error && response.statusCode == 200) {
            // Print out the response body
            var temp = JSON.parse(body);
            token = temp.token;
            console.log("ccccccccccccccccc", temp.token);
            var headers = {
                'authorization': 'Bearer ' + temp.token,
                'authorization': 'Bearer ' + temp.token,
                'Content-Type': 'application/json'

            }
            var tempArgs = [];
            tempArgs.push({
                'UName': 'First University'
            });
            console.log("Testing the output", JSON.stringify(tempArgs));
            var strfy = JSON.stringify(tempArgs);

            // Configure the request
            var options = {

                url: 'http://34.234.82.177:4000/channels/mychannel/chaincodes/studentcc',

                method: 'POST',

                headers: headers,
                body: {

                    'fcn': 'create',

                    'args': ['a', JSON.stringify({
                        'Name': req.body.name
                    })]

                },

                json: true

                //form: {'fcn': 'create', 'args':strfy }
            }

            console.log("Req for options", options);
            // Start the request
            /*                         request(options, function (error, response, body) {
                                                                                if (!error && response.statusCode == 200) {
                                                                                                // Print out the response body
                                                                //Code for illunoise code testing
                                                                //var input = '%5B%22a%22%5D';
                                                                 var input = [];
                                                                 input.push('a');
                                                                
                                                                
                                                                        var options = {
                                                                                        url: 'http://34.234.82.177:4000/channels/mychannel/chaincodes/studentcc?peer=peer1&fcn=get&args=%5B%22a%22%5D',
                                                                                        method: 'GET',
                                                                                        headers: headers
                                                                                    }
                                                                console.log("Get command",options);
                                                                        request(options, function (error, response, body) {
                                                                                                if (!error && response.statusCode == 200) {
                                                                                                                // Print out the response body
                                                                                                                console.log("Response from GET  ",body)

                                                                                                }
                                                                                        });*/
        }
    });
    //end of chain code


    //Main DB call to insert token
    dbForAdminRequestTable.list({
        include_docs: true
    }, function(err, body) {
        if (err) {
            console.log('Issue in fetching data.');
        }
        for (var i = 0; i < body.rows.length; i++) {
            if (body.rows[i].doc.digitalId === req.body.id) {
                id = body.rows[i].doc._id;
                revId = body.rows[i].doc._rev;
                digitalid = body.rows[i].doc.digitalId;
                requestdate = body.rows[i].doc.requestDate;
                applicantname = body.rows[i].doc.applicantName;
            }
        }
        console.log('Status to be updated for reqId with token: ' + id + token);
        var response = "";
        dbForAdminRequestTable.insert({
            _id: id,
            _rev: revId,
            status: newstatus,
            digitalId: digitalid,
            requestDate: requestdate,
            applicantName: applicantname
        }, function(err, body) {
            if (!err) {
                response = {
                    status: 200,
                    message: 'Status updated.'
                }
                dbForAdminRequestTable.list({
                    include_docs: true
                }, function(err, body) {
                    if (!err) {
                        //console.log(body)
                    }
                })
                console.log('Status updated.');
            } else {
                response = {
                    status: 400,
                    message: 'Issue in updating the status.'
                }
                console.log('Status updation issue.');
            }
        })
    })

    dbForApplicantData.list({
        include_docs: true
    }, function(err, body) {
        var id = "";
        var revId = "";
        var applicantName = "";
        var attachments = "";
        var ssn = "";
        var dob = "";
        var code = "";
        var number = "";
        var gender = "";
        var emailId = "";
        var address = "";
        if (err) {
            console.log('Issue in fetching data.');
        }
        for (var i = 0; i < body.rows.length; i++) {
            if (body.rows[i].doc._id === req.body.id) {
                id = body.rows[i].doc._id;
                revId = body.rows[i].doc._rev;
                attachments = body.rows[i].doc._attachments;
                ssn = body.rows[i].doc.ssn;
                dob = body.rows[i].doc.dob;
                code = body.rows[i].doc.countryCode;
                number = body.rows[i].doc.phoneNumber;
                gender = body.rows[i].doc.gender;
                emailId = body.rows[i].doc.email;
                address = body.rows[i].doc.address;
                applicantName = body.rows[i].doc.name;
            }
        }
        console.log('Status to be updated for reqId : ' + id);
        dbForApplicantData.insert({
            _id: id,
            _rev: revId,
            _attachments: attachments,
            ssn: ssn,
            dob: dob,
            countryCode: code,
            phoneNumber: number,
            gender: gender,
            email: emailId,
            address: address,
            token: token,
            name: applicantName
        }, function(err, body) {
            if (!err) {
                response = {
                    status: 200,
                    message: 'Status updated.'
                }
                console.log('Status updated.');
            } else {
                response = {
                    status: 400,
                    message: 'Issue in updating the status.'
                }
                console.log('Status updation issue.');
            }
            res.send(JSON.stringify(response));
        })
    })

});
app.listen(port);