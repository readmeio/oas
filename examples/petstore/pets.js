"use strict";

var utils = require("../utils/writer.js");
var Pet = require("../service/PetService");

/*
 * @oas [get] /pets Get pets
 * description: Returns all pets from the system that the user has access to
 * tags:
 *  - pets
 * parameters:
 *   - (query) limit {Integer:int32} How many items to return at one time (max 100)
 */

module.exports.getAllPets = function getAllPets(req, res, next) {
  Pet.getAllPets()
    .then(function(response) {
      utils.writeJson(res, response);
    })
    .catch(function(response) {
      utils.writeJson(res, response);
    });
};

/*
 * @oas [post] /pets Create a pet
 * description: Create a new pet associated with a user
 * tags:
 *  - pets
 * parameters:
 *   - (body) name {String} What to call this pet
 *   - (body) type {String} The type of pet it is
 *   - (body) status {String} The status of the pet
 */

module.exports.addPet = function addPet(req, res, next) {
  var body = req.swagger.params["body"].value;
  Pet.addPet(body)
    .then(function(response) {
      utils.writeJson(res, response);
    })
    .catch(function(response) {
      utils.writeJson(res, response);
    });
};

/*
 * @oas [delete] /pets/{petId} Delete pet
 * description: Deletes a pet that the user has access to
 * tags:
 *  - pets
 * parameters:
 *   - (path) petId {String} The ID of the pet
 */

module.exports.deletePet = function deletePet(req, res, next) {
  var petId = req.swagger.params["petId"].value;
  var api_key = req.swagger.params["api_key"].value;
  Pet.deletePet(petId, api_key)
    .then(function(response) {
      utils.writeJson(res, response);
    })
    .catch(function(response) {
      utils.writeJson(res, response);
    });
};

/*
 * @oas [get] /pets/findByStatus Find by status
 * description: Find all pets by status that the user has access to
 * tags:
 *  - pets
 * parameters:
 *   - (query) status {String} Find all pets with this status
 *   - (query) limit {Integer:int32} How many items to return at one time (max 100)
 */

module.exports.findPetsByStatus = function findPetsByStatus(req, res, next) {
  var status = req.swagger.params["status"].value;
  Pet.findPetsByStatus(status)
    .then(function(response) {
      utils.writeJson(res, response);
    })
    .catch(function(response) {
      utils.writeJson(res, response);
    });
};

/*
 * @oas [get] /pets/{petId} Get pet
 * description: Returns the info for a single pet
 * tags:
 *  - pets
 * parameters:
 *   - (path) petId {String} The id of the pet to retrieve
 */

module.exports.getPetById = function getPetById(req, res, next) {
  var petId = req.swagger.params["petId"].value;
  Pet.getPetById(petId)
    .then(function(response) {
      utils.writeJson(res, response);
    })
    .catch(function(response) {
      utils.writeJson(res, response);
    });
};
