const fs = require( 'fs' );
const SerpApi = require( 'google-search-results-nodejs' );
const { start } = require( 'repl' );
const search = new SerpApi.GoogleSearch( "7152fbabe15071361501ee4760256b3f6c65b5899c8d87d0c03bfedd403fddb5" );


const params = {
    engine: "google_maps",
    type: "search",
    google_domain: "google.com",
    q: "coffees",
    hl: "vi",
    ll: "@11.94118562999679,108.45827227925662,14z",
    start: 20
};

const filePath = 'out.csv';
const headers = [ 'target', 'title', 'address', 'imgUrl', 'description', 'latitude', 'longitude', 'rating' ];

const callback = function ( response ) {
    const rows = [];

    response.local_results.forEach( ( item ) => {
        const { title, address, gps_coordinates, rating, thumbnail, description } = item;
        const { latitude, longitude } = gps_coordinates;

        // Normalize the data
        const normalizedRow = {
            target: normalizeValue( params.q ),
            title: normalizeValue( title ),
            address: normalizeValue( address ),
            imgUrl: normalizeValue( thumbnail ),
            description: normalizeValue( description ),
            latitude: normalizeValue( latitude ),
            longitude: normalizeValue( longitude ),
            rating: normalizeValue( rating )
        };

        rows.push( normalizedRow );
    } );

    appendToCSV( filePath, headers, rows );

    // Check if the result is less than 20
    if ( response.local_results.length < 20 ) {
        console.log( 'Done!' );
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
    const fileExists = fs.existsSync( filePath );

    let csvContent = '';
    if ( !fileExists ) {
        const headerRow = headers.join( delimiter );
        csvContent += `${ headerRow }\n`;
    } else {
        // Read existing content from the file
        const existingContent = fs.readFileSync( filePath, 'utf8' );

        // Split the existing content into rows
        const existingRows = existingContent.trim().split( '\n' );

        // Remove duplicate rows from the new data
        const uniqueRows = rows.filter( ( row ) => {
            const rowContent = headers
                .filter( ( header ) => header !== 'target' )
                .map( ( header ) => row[ header ] || '' )
                .join( delimiter );
            return !existingRows.includes( rowContent );
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

    // Append the content to the file
    fs.appendFileSync( filePath, csvContent, { encoding: 'utf8' } );
}

search.json( params, callback );