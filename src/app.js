// OORP router
( function ( document, window ) {
var $       = document.querySelectorAll.bind( document ),
    hash    = document.location.hash.replace( "#", "" ),
    NOTHASH = /.*\#/,
    OPTIONS, DEFAULT;

// Psuedo constants
OPTIONS = [].slice.call( $( "ul.pills li a" ) ).map( function ( i ) { return i.href.replace( NOTHASH, "" ); } );
DEFAULT = OPTIONS[0];

// Dispatches a Custom Event
function dispatch ( obj, type, data, bubbles, cancelable ) {
	var ev;

	try {
		ev = new CustomEvent( type );
	}
	catch ( e ) {
		ev = document.createEvent( "CustomEvent" );
	}

	bubbles    = ( bubbles    !== false );
	cancelable = ( cancelable !== false );

	ev.initCustomEvent( type, bubbles, cancelable, data || {} );
	obj.dispatchEvent( ev );

	return obj;
}

// Hash change handler
function hashchange ( ev ) {
	var oldHash  = ev.oldURL.indexOf( "#" ) > -1 ? ev.oldURL.replace( NOTHASH, "" ) : null,
	    newHash  = ev.newURL.indexOf( "#" ) > -1 ? ev.newURL.replace( NOTHASH, "" ) : null,
	    $oldDiv  = oldHash ? $( "#" + oldHash )[0] : null,
	    $newDiv  = newHash ? $( "#" + newHash )[0] : null,
	    $oldItem = oldHash ? $( "a[href='#" + oldHash + "']" )[0] : null,
	    $newItem = newHash ? $( "a[href='#" + newHash + "']" )[0] : null;

	ev.preventDefault();
	ev.stopPropagation();

	if ( $oldItem && $oldDiv ) {
		$oldItem.parentNode.classList.remove( "active" );
		$oldDiv.classList.add( "hidden" );
	}

	if ( $newItem && $newDiv ) {
		$newItem.parentNode.classList.add( "active" );
		$newDiv.classList.remove( "hidden" );
	}
	else {
		document.location.hash = DEFAULT;
	}
}

// Nav click handler
function click ( ev ) {
	var target = ev.srcElement || ev.target;

	if ( target.nodeName === "LI" ) {
		ev.preventDefault();
		ev.stopPropagation();

		if ( document.location.hash.replace( "#", "" ) !== target.childNodes[0].href.replace( NOTHASH, "" ) ) {
			dispatch( target.childNodes[0], "click" );
		}
	}
}

// Setting listeners
window.addEventListener( "hashchange", hashchange, false );
$( "nav" )[0].addEventListener( "click", click, false );

// Setting state
if ( hash !== "" && OPTIONS.indexOf( hash ) > -1 ) {
	$( "#" + hash )[0].classList.remove( "hidden" );
	$( "a[href='#" + hash + "']" )[0].parentNode.classList.add( "active" );
}
else {
	document.location.hash = DEFAULT;
}
} )( document, window );

// Sets the version
(function ( util ) {
var $       = util.$,
    element = util.element,
    request = util.request;

element.html( $( "#year" )[0], new Date().getFullYear() );

request( "/", "head" ).then( function ( headers ) {
	element.html( $( "#version" )[0], headers.server.split( " " )[0].replace( /.*\//, "" ) );
} );
} )( keigai.util );
