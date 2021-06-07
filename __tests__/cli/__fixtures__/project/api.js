/*
 * @api [get] /pets
 *    description: "Returns all pets from the system that the user has access to"
 *    operationId: "findPets"
 *    parameters:
 *      -
 *        name: "tags"
 *        in: "query"
 *        description: "tags to filter by"
 *        required: false
 *        style: "form"
 *        schema:
 *          type: "array"
 *          items:
 *            type: "string"
 *      -
 *        name: "limit"
 *        in: "query"
 *        description: "maximum number of results to return"
 *        required: false
 *        schema:
 *          type: "integer"
 *          format: "int32"
 *    responses:
 *      "200":
 *        description: "pet response"
 *        content:
 *          application/json:
 *            schema:
 *              type: "array"
 *              items:
 *                $ref: "#/components/schemas/Pet"
 *      default:
 *        description: "unexpected error"
 *        content:
 *          application/json:
 *            schema:
 *              $ref: "#/components/schemas/ErrorModel"
 */

router.get('/pets', () => {

});

/*
 * @api [post] /pets
 *    description: "Creates a new pet in the store. Duplicates are allowed"
 *    operationId: "addPet"
 *    requestBody:
 *      description: "Pet to add to the store"
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: "#/components/schemas/Pet"
 *    responses:
 *      "200":
 *        description: "pet response"
 *        content:
 *          application/json:
 *            schema:
 *              type: "array"
 *              items:
 *                $ref: "#/components/schemas/Pet"
 *      default:
 *        description: "unexpected error"
 *        content:
 *          application/json:
 *            schema:
 *              $ref: "#/components/schemas/ErrorModel"
 */

router.post('/pets', () => {

});

/*
 * @api [get] /pets/{id}
 *    description: "Returns a user based on a single ID, if the user does not have access to the pet"
 *    operationId: "findPetById"
 *    parameters:
 *      -
 *        name: "id"
 *        in: "path"
 *        description: "ID of pet to fetch"
 *        required: true
 *        schema:
 *          type: "integer"
 *          format: "int64"
 *    responses:
 *      "200":
 *        description: "pet response"
 *        content:
 *          application/json:
 *            schema:
 *              type: "array"
 *              items:
 *                $ref: "#/components/schemas/Pet"
 *      default:
 *        description: "unexpected error"
 *        content:
 *          application/json:
 *            schema:
 *              $ref: "#/components/schemas/ErrorModel"
 */

router.get('/pets/{id}', () => {

});

/*
 * @api [delete] /pets/{id}
 *    description: "deletes a single pet based on the ID supplied"
 *    operationId: "deletePet"
 *    parameters:
 *      -
 *        name: "id"
 *        in: "path"
 *        description: "ID of pet to delete"
 *        required: true
 *        schema:
 *          type: "integer"
 *          format: "int64"
 *    responses:
 *      "204":
 *        description: "pet deleted"
 *      default:
 *        description: "unexpected error"
 *        content:
 *          application/json:
 *            schema:
 *              $ref: "#/components/schemas/ErrorModel"
 */

router.delete('/pets/{id}', () => {

});

/*
 * @schema Pet
 * required:
 *   - id
 *   - name
 * properties:
 *   id:
 *     type: integer
 *     format: int64
 *   name:
 *     type: string
 *   tag:
 *     type: string
 */

/*
 * @schema ErrorModel
 * required:
 *   - message
 * properties:
 *   message:
 *     type: string
 */
