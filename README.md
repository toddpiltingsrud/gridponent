# gridponent (in development)
A grid web component

This is a grid that makes use of the web component API. 

It has the following features:
- Client side sorting, paging, and searching
- Configurable server-side sorting, paging and search with
- In place editing
- Column templating and formatting
- Fixed headers
- Fixed footers
- Responsive
- Configurable search and paging positions

Support for IE9 is achieved by falling back to querying the DOM for grid-ponent elements and rendering them after the page loads.
That means grid-ponent elements that are added dynamically after the page has loaded will not automatically be detected and rendered in IE9.