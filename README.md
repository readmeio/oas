oas
===

Creating Swagger / OpenAPI Spec files is hard. This makes it easier.

[![](https://d3vv6lp55qjaqc.cloudfront.net/items/1M3C3j0I0s0j3T362344/Untitled-2.png)](https://readme.com)

This tool currently supports `Swagger 2` and `OAS 3`.

Installation
------------

    npm install oas -g

Usage
-----

Go to a directory with your API, and type:

    oas init

It will walk you through how to document your API with a OpenAPI 3.0 Spec.

Swagger Inline
--------------

Rather than trying to juggle one gigantic repo, `oas` uses something called
[swagger-inline](https://github.com/readmeio/swagger-inline). It lets you include
a little swagger snippet in a comment above your code, and collects them all
together into one Swagger file:

```javascript
/*
 * @oas [get] /pet/{petId}
 * description: "Returns all pets from the system that the user has access to"
 * parameters:
 *   - (path) petId=hi* {String} The pet ID
 *   - (query) limit {Integer:int32} The number of resources to return
*/
route.get("/pet/:petId", pet.show);
```

You need to start with `@oas [method] path`, but everything below it is a valid
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

    oas host

This will upload your Swagger file and give you a URL you can use.

