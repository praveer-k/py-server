http = require("http"),
path = require("path"),
url = require("url"),
qs = require('querystring'),
runner = require("child_process"),
fs = require("fs");
/******************** CONSTANTS *****************/
var DEFAULT_PATH = "./";
var QUOTES = '\"\"';
var PORT = 8000;
/************************************************/
function sendError(errCode, errString, response){
    response.writeHead(errCode, {"Content-Type": "text/plain;charset=utf-8"});
    response.write("Error: " + errString + "\n");
    response.end();
    return false;
}

function sendData(err, stdout, filetype, response){
    if(err!==null) return sendError(500, err, response);
    switch(filetype){
      case 'html':
          response.writeHead(200,{"Content-Type": "text/html;charset=utf-8",
								  "Cache-Control" : "no-cache, no-store, must-revalidate",
								  "Pragma": "no-cache",
								  "Expires": 0
								 });
          response.write(stdout);
          response.end();
          break;
      case 'image':
          response.writeHead(200,{"Content-Type": "image/png/jpeg/gif/jpg/ico",
								  "Cache-Control" : "no-cache, no-store, must-revalidate",
								  "Pragma": "no-cache",
								  "Expires": 0
								 });
          response.end(stdout,'binary');
          break;
      case 'css':
          response.writeHead(200,{"Content-Type": "text/css;charset=utf-8",
								  "Cache-Control" : "no-cache, no-store, must-revalidate",
								  "Pragma": "no-cache",
								  "Expires": 0
								 });
          response.write(stdout);
          response.end();
          break;
      case 'js':
          response.writeHead(200,{"Content-Type": "text/javascript;charset=utf-8",
								  "Cache-Control" : "no-cache, no-store, must-revalidate",
								  "Pragma": "no-cache",
								  "Expires": 0
								 });
          response.write(stdout);
          response.end();
          break;
      case 'text':
          response.writeHead(200,{"Content-Type": "text/plain;charset=utf-8",
								  "Cache-Control" : "no-cache, no-store, must-revalidate",
								  "Pragma": "no-cache",
								  "Expires": 0
								 });
          response.write(stdout);
          response.end();
          break;
       case 'xml':
          response.writeHead(200,{"Content-Type": "text/xml;charset=utf-8",
								  "Cache-Control" : "no-cache, no-store, must-revalidate",
								  "Pragma": "no-cache",
								  "Expires": 0
								 });
          response.write(stdout);
          response.end();
          break;
    }
}

function getContentType(filepath, mediaType){
	var stat = fs.statSync(filepath);
	console.log(stat);
	var content_type = "";
	//Some files which has extensions confilicting (e.g. mp4 is both video and audio) might have issues playing using this logic.
	switch(mediaType){
      //video Streaming
		case 'avi':
			content_type = {'Content-Type': 'video/avi','Content-Length': stat.size };
		case 'mpeg':
		case 'mpg':
			content_type = {'Content-Type': 'video/mpeg','Content-Length': stat.size};
		case 'mp4':
			content_type = {'Content-Type': 'video/mp4','Content-Length': stat.size};
		case 'ogg':
			content_type = {'Content-Type': 'video/ogg','Content-Length': stat.size};
		case 'mov':
			content_type = {'Content-Type': 'video/quicktime','Content-Length': stat.size};
		case 'webm':
			content_type = {'Content-Type': 'video/webm','Content-Length': stat.size};
		case 'wmv':
			content_type = {'Content-Type': 'video/x-ms-wmv','Content-Length': stat.size};
		case 'flv':
			content_type = {'Content-Type': 'video/x-flv','Content-Length': stat.size};
		//audio Streaming
		case 'mp3':
			content_type = {'Content-Type': 'audio/mpeg','Content-Length': stat.size};
		case 'opus':
			content_type = {'Content-Type': 'audio/opus','Content-Length': stat.size};
		case 'oga':
			content_type = {'Content-Type': 'audio/vorbis','Content-Length': stat.size};
		case 'wav':
			content_type = {'Content-Type': 'audio/vnd.wave','Content-Length': stat.size};		
	}
	return content_type;
}

function sendFile(err, filepath, filetype, filename, response){
  if(err!==null) return sendError(404, err, response);
  response.setHeader( "Content-Disposition", "attachment; filename=\""+filename+"\"" );
  response.setHeader('Content-type', filetype);
  var filestream = fs.createReadStream(filepath);
  filestream.pipe(response);
}

function stream_response( filepath, mediaType, response ){
    var readStream = fs.createReadStream(filepath);
	var contentType = getContentType(filepath, mediaType);
    readStream.on('data', function(data) {
        var flushed = response.write(data);
        if(!flushed){
            readStream.pause();
        }
    });
    response.on('drain', function() {
        // Resume the read stream when the write stream gets hungry 
        readStream.resume();
    });
    readStream.on('end', function() {
        response.end();
    });
    readStream.on('error', function(err) {
        console.error('Exception', err, 'while streaming', filepath);
        response.end();
    });
    response.writeHead(200, contentType);
}

function runFile(err, localpath, filetype, param, response){
  if(err!==null) return sendError(404, 'File not found', response);
  switch(filetype){
    case 'py':
        console.log('python "' + localpath + '" ' + param);
        runner.exec('python "' + localpath + '" ' + param, function(error, stdout) {
                                                              //console.log(stdout);
                                                              sendData(error, stdout, 'html', response);
                                                          });
        break;
    case 'php':
        console.log('php "' + localpath + '" ' + param);
        runner.exec('php "' + localpath + '" ' + param, function(error, stdout) {
                                                            //console.log(stdout);
                                                            sendData(error, stdout, 'html', response);
                                                        });
        break;
  }
  return;
}

function getDateTime() {
    var date = new Date();
    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;
    var millisec = date.getMilliseconds();
    millisec = (millisec < 10 ? "0" : "") + millisec;
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    return year + month + day + "_" + hour + min + sec + millisec;
}

function getArgs(formData, method, filetype){
    var args='';
    if(method=="POST" && formData!=null){
      for(var key in formData){
        args =  args + QUOTES + key + QUOTES + ':' + QUOTES + formData[key] + QUOTES + ', ';
      }
    }else if(method=="GET" && formData!=null){
      var arr = formData.split("&");
      for(var i in arr){
        var val = arr[i].split("=");
        args =  args + QUOTES + val[0] + QUOTES + ':' + QUOTES + val[1] + QUOTES + ', ';
      }
    }
    args = (args.length>0) ? '\"{' + args.substr(0, args.length-2) + '}\"' : ''; 
    //console.log("Requesting Page Arguments :" + args);
    return args;
}

function runTheRequest(localpath,args,fileExtention,response){
	var filename = localpath.split("\\");
	filename = filename[filename.length-1];
	fs.exists(localpath, function(result) {
						  if(result){
							  var err=null;
							 switch(fileExtention){
								//MRS files
								case '.py':
									  runFile(err, localpath, 'py', args, response);
									  break;
								case '.php':
									  runFile(err, localpath, 'php', args, response);
									  break;
								//HTML files
								case '.html':
									  var stdout = fs.readFileSync(localpath);
									  sendData(err, stdout, 'html', response);
									  break;
								//Text files
								case '.txt':
									  var stdout = fs.readFileSync(localpath);
									  sendData(err, stdout, 'text', response);
									  break;
								//XML files
								case '.xml':
									  var stdout = fs.readFileSync(localpath);
									  sendData(err, stdout, 'xml', response);
									  break;
								//Image files
								case '.png':
								case '.gif':
								case '.jpeg':
								case '.jpg':
								case '.ico':
									  var stdout = fs.readFileSync(localpath);
									  if(result){
										sendData(err, stdout, 'image', response);
									  }else{
										http.request(request.url, function(err, stdout){
											if(resp.status==200){ sendData(err, stdout, 'image', response); }
										});
									  }
									  break;
								case '.avi':
								case '.mpeg':
								case '.mpg':
								case '.mp4':
								case '.ogg':
								case '.mov':
								case '.webm':
								case '.wmv':
								case '.flv':
								case '.swf':
								case '.mp3':
										stream_response(localpath, fileExtention.substr(1,fileExtention.length-1), response);
									  break;
								//CSS files'./'+
								case '.css':
									  var stdout = fs.readFileSync(localpath);
									  sendData(err, stdout, 'css', response);
									  break;
								case '.js':
									  var stdout = fs.readFileSync(localpath);
									  sendData(err, stdout, 'js', response);
									  break;
								default:
										fs.stat(localpath, function (stat_error, stat) {
													  if (stat_error) {
														sendError(404, localpath + ", " + stat_error, response);
													  }
													  if (stat.isFile()) {
														sendFile(err, localpath, fileExtention, filename, response);
													  } else {
														sendError(404, "Permission Denied !!!" , response);
													  }
									  });
									  break;
							  }
						  }
			  });
}

function htmlInterface(request, response){
    var runnerTypes = [".py",".php",".html",".txt"];
    var url_parts = url.parse(request.url);
    var urlpath = url_parts.pathname;
    var param = url_parts.query;
    var localpath = path.resolve(path.join(DEFAULT_PATH, urlpath));
    var counter = 0;
    var formData;
    var args;
    var fileExtention;
    if(urlpath == "/"){
      do{
        urlpath = "/index"+runnerTypes[counter];
        localpath = path.resolve(path.join(DEFAULT_PATH, urlpath));
        counter++;
      }while(!fs.existsSync(localpath) && counter<runnerTypes.length);
      counter--;
    }
    if(!fs.existsSync(localpath)){
      sendError(404, "Supported file types not found on the base link !!!", response);
    }else{
        fileExtention = path.extname(localpath);
        switch(request.method){
          case 'GET':
            args = getArgs(param, 'GET', fileExtention);
            runTheRequest(localpath,args,fileExtention,response);
            break;
          case 'POST':
            var data;
            args = getArgs(param, 'GET', fileExtention);
            request.on('data', function(chunk) { data = chunk.toString(); });
            request.on('end', function(){
                formData = qs.parse(data);
                args = args + getArgs(formData, 'POST', fileExtention);
                runTheRequest(localpath,args,fileExtention,response);
            });
          break;
          default:
            runTheRequest(localpath,args,fileExtention,response);
          break;
        }
	}
}
console.log("Starting Server...");
var server = http.createServer(htmlInterface);
server.listen(PORT);
console.log("Server ready to get the HTML interface on port "+PORT+".");