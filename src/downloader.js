const fs = require( "fs-extra" );
const axios = require( "axios" );

module.exports.doTheDownloads = async ( { jsonFile, baseUrl, basePath }, logger ) => {
	const parseImages = post => {
		const matches = post.html.match( /(?<=src="\/)content[^"]*/gi );
		return matches || [];
	};

	const downloadImage = ( url, localPath ) => {
		logger.info( `downloading ${ url } to ${ localPath } ...` );
		return axios( { url, responseType: "stream" } )
			.then( response => {
				response.data.pipe( fs.createWriteStream( localPath ) );
				return "";
			} )
			.catch( () => { return url; } );
	};

	const backup = await fs.readJson( jsonFile );
	const blog = backup.db[ 0 ].data;
	let images = [];
	const badUrls = [];
	blog.posts.forEach( post => {
		images = [ ...images, ...parseImages( post ) ];
	} );
	for ( let i = 0; i < images.length; i++ ) {
		const image = images[ i ];
		const parts = image.split( "/" );
		const filename = parts.pop();
		const localPath = `${ basePath }/${ parts.join( "/" ) }`;
		const filePath = `${ localPath }/${ filename }`;
		if ( !fs.existsSync( filePath ) ) {
			fs.ensureDirSync( localPath );
			const url = await downloadImage( `${ baseUrl }/${ image }`, filePath ); // eslint-disable-line no-await-in-loop
			if ( url ) {
				badUrls.push( url );
			}
		}
	}
	logger.info( "finished downloading" );
	if ( badUrls.length > 0 ) {
		logger.warn( "failed to download:", badUrls );
	}
};
