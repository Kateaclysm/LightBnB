const properties = require("./json/properties.json");
const users = require("./json/users.json");


const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

pool.query(`SELECT title FROM properties LIMIT 10;`).then(response => {console.log(response)})
/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  const queryString = `
    SELECT *
    FROM users
    WHERE email = $1;
  `;
  const values = [email];

  return pool.query(queryString, values)
    .then(res => {
      if (res.rows.length > 0) {
        return res.rows[0]; // The user object
      } else {
        return null; // No user found with that email
      }
    })
    .catch(err => console.error('query error', err.stack));
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  const queryString = `
  SELECT *
  FROM users
  WHERE id = $1
  `;
  const values = [id];
  
  return pool.query(queryString, values)
  .then(res => {
    if (res.rows.length > 0) {
      return res.rows[0];
    } else {
      return null;
    }
  })
  .catch(err => {
    console.error('Query Error', err.stack);
    return null;
  })
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const queryString = `
  INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING *;
  `;
  const values = [user.name, user.email, user.password];

  return pool.query(queryString, values)
  .then(res => {
    return res.rows[0];
  })
  .catch (err => {
    console.error('Query Error! Failed to add user.', err.stack);
    return null;
  })
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit) {
  // Select all reservations, all properties, and the average rating
  // join properties table using the reservations foreign key
  return pool.query(
    `SELECT reservations.*, properties.*, avg(rating) as average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    GROUP BY properties.id, reservations.id
    ORDER BY properties.title
    LIMIT $2;`, [guest_id, limit])
    .then ((results) => {
      return results.rows;
    })
    .catch((err) => {
      console.error(err);
    })
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

  const getAllProperties = (options, limit) => {
    const queryParams = [];
    
    // First half of query string... I.E: Before any modification by search function.
    let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_id`;

    // after this is where we add the customizable search
    if (options.city) {
      queryParams.push(`%${options.city}%`);
      queryString += ` WHERE city LIKE $${queryParams.length} `;
      console.log(queryString, queryParams);
    }
    if (options.owner_id) {
      queryParams.push(options.owner_id);
      queryString += ` AND owner_id = $${queryParams.length} `;
    }
    if (options.minimum_price_per_night) {
      queryParams.push(Number(options.minimum_price_per_night) * 100);
      if (queryParams.length === 1) {
        queryString += ` WHERE cost_per_night >= $${queryParams.length} `;
      } else {
        queryString += ` AND cost_per_night >= $${queryParams.length} `;
      }
    }
    if (options.maximum_price_per_night) {
      queryParams.push(Number(options.maximum_price_per_night) * 100);
      queryString += ` AND cost_per_night <= $${queryParams.length} `;
    }
    queryString += ` GROUP BY properties.id `;

    if (options.minimum_rating) {
    queryParams.push(Number(options.minimum_rating));
    queryString += ` HAVING avg(property_reviews.rating) >= $${queryParams.length} `;
  }

    queryParams.push(limit);
    queryString += `
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;

    return pool.query(queryString, queryParams)
     .then((result) => {
       return result.rows;
     })
     .catch((err) => {
       console.log(err.message);
     });
} 


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
