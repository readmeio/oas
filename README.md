oai
===

Creating Swagger files is hard. This makes it easier.

[![](https://cl.ly/3u0w200s1h43/Untitled-2.png)](http://readme.io)

Installation
------------

    npm install oai -g

Usage
-----

Go to a directory with your API, and type:

    oai init

It will walk you through how to document your API with Open API Initiave.

Swagger Inline
--------------

Rather than trying to juggle one gigantic repo, `oai` uses something called
[swagger-inline](https://github.com/readmeio/swagger-inline). It lets you include
a little swagger snippet in a comment above your code, and collects them all
together into one Swagger file:

```javascript
/*
 * @api [get] /pet/{petId}
 * description: "Returns all pets from the system that the user has access to"
 * parameters:
 *   - (path) petId=hi* {String} The pet ID
 *   - (query) limit {Integer:int32} The number of resources to return
*/
route.get("/pet/:petId", pet.show);
```

You need to start with `@api [method] path`, but everything below it is a valid
[Swagger Path Definition](http://swagger.io/specification/#pathItemObject).

You can also do **inline parameters**, which are shorthand for parameters. They
aren't valid Swagger, however Swagger Inline knows how to compile them:

```
- (in) name=default* {type:format} Description
```

Host your Swagger file
----------------------

Hosting Swagger files is hard! So, we have an online component that hosts your
Swagger file for you. Just type the following to get a URL:

    oai host

This will upload your Swagger file and give you a URL you can use.

