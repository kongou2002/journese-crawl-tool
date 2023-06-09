const fs = require( 'fs' );
const SerpApi = require( 'google-search-results-nodejs' );
const dotenv = require( 'dotenv' );
dotenv.config();
const API_KEY = process.env.API_KEY;
const search = new SerpApi.GoogleSearch( API_KEY );
const params = {
    engine: "google_maps",
    type: "search",
    google_domain: "google.com",
    q: "coffee",
    hl: "vi",
    ll: "@11.94118562999679,108.45827227925662,14z",
    start: 20
};
//modified file path here
const filePath = 'coffee.csv';
//modified headers here
const headers = [ 'target', 'title', 'address', 'imgUrl', 'description', 'latitude', 'longitude', 'rating', 'reviews', 'phone', 'province', 'city', 'website', 'place_id' ];
const callback = function ( response ) {
    const rows = [];

    response.local_results.forEach( ( item ) => {
        //destructure item here
        const { title, address, gps_coordinates, rating, thumbnail, description, place_id, reviews, phone, website } = item;
        const { latitude, longitude } = gps_coordinates;
        const province = "Lâm đồng";
        const city = "Đà lạt";
        // Normalize the data
        const normalizedRow = {
            target: normalizeValue( params.q ),
            title: normalizeValue( title ),
            address: normalizeValue( address ),
            imgUrl: normalizeValue( thumbnail ),
            description: normalizeValue( description ),
            latitude: normalizeValue( latitude ),
            longitude: normalizeValue( longitude ),
            rating: normalizeValue( rating ),
            place_id: normalizeValue( place_id ),
            reviews: normalizeValue( reviews ),
            phone: normalizeValue( phone ),
            city: normalizeValue( city ),
            province: normalizeValue( province ),
            website: normalizeValue( website )
        };

        rows.push( normalizedRow );
    } );

    appendToCSV( filePath, headers, rows );

    // Check if the result is less than 20
    if ( response.local_results.length < 20 && response.local_results.length === 0 ) {
        console.log( 'Done!' );
        checkDup( filePath );
    } else {
        params.start += 20; // Increment the start value by 20
        search.json( params, callback ); // Call the search again with the updated params
    }
};

function normalizeValue( value ) {
    if ( typeof value === "string" ) {
        // Remove any line breaks or commas
        return value.replace( /[\r\n]+/g, ' ' ).replace( /,/g, '' );
    } else {
        return value;
    }
}

function appendToCSV( filePath, headers, rows ) {
    const delimiter = ',';

    let csvContent = '';
    if ( !fs.existsSync( filePath ) ) {
        // Create the file with headers
        const headerRow = headers.join( delimiter );
        csvContent += `${ headerRow }\n`;
    }

    // Read existing content from the file
    if ( fs.existsSync( filePath ) ) {
        const existingContent = fs.readFileSync( filePath, 'utf8' );
        // Split the existing content into rows
        const existingRows = existingContent.trim().split( '\n' );

        // Remove duplicate rows from the new data
        const uniqueRows = rows.filter( ( row ) => {
            const rowContent = headers
                .filter( ( header ) => header !== 'target' )
                .map( ( header ) => row[ header ] || '' )
                .join( delimiter );

            // Check if the place_id already exists in the CSV
            const existingPlaceIds = existingRows.map( ( row ) => {
                const columns = row.split( delimiter );
                return columns[ headers.indexOf( 'place_id' ) ];
            } );

            return !existingPlaceIds.includes( row.place_id ) && !existingRows.includes( rowContent );
        } );

        // If all rows are duplicates, exit the function
        if ( uniqueRows.length === 0 ) {
            console.log( 'Data already exists in the CSV file. Skipping...' );
            return;
        }
        // Add the unique rows to the CSV content
        uniqueRows.forEach( ( row ) => {
            const values = headers.map( ( header ) => row[ header ] || '' );
            const rowContent = values.join( delimiter );
            csvContent += `${ rowContent }\n`;
        } );
    }

    // Append or create the file
    fs.writeFileSync( filePath, csvContent, { encoding: 'utf8', flag: 'a' } );


}
const checkDup = ( filePath ) => {
    // Read the CSV file
    const fileContent = fs.readFileSync( filePath, 'utf8' );

    // Split the file content into rows
    const rows = fileContent.trim().split( '\n' );

    // Extract the place_id values from the existing rows
    const placeIds = rows.map( ( row ) => {
        const columns = row.split( ',' );
        return columns[ headers.indexOf( 'place_id' ) ];
    } );

    // Find duplicate place_id values
    const duplicatePlaceIds = placeIds.filter( ( placeId, index ) => placeIds.indexOf( placeId ) !== index );

    // Log the number of duplicated rows
    console.log( `${ duplicatePlaceIds.length } rows are duplicated` );

    // Remove duplicate rows based on place_id
    const uniqueRows = rows.filter( ( row ) => {
        const columns = row.split( ',' );
        const placeId = columns[ headers.indexOf( 'place_id' ) ];
        return !duplicatePlaceIds.includes( placeId );
    } );

    // Write back the unique rows to the CSV file
    fs.writeFileSync( filePath, uniqueRows.join( '\n' ), 'utf8' );
};



search.json( params, callback );