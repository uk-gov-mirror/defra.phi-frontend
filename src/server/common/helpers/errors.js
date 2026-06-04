function setErrorMessage(request, titleText, errorListText) {
  request.yar.set('errors', {
    list: {
      titleText,
      errorList: [
        {
          text: errorListText,
          href: '#itembox'
        }
      ]
    }
  })
  request.yar.set('errorMessage', {
    message: { text: errorListText }
  })

  return true
}

function catchAll(request, h) {
  const { response } = request
  const sameOrigin = 'same-origin'

  if (!response.isBoom) {
    response.header(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    )
    response.header('X-Content-Type-Options', 'nosniff')
    response.header('X-Frame-Options', 'DENY')
    response.header('X-XSS-Protection', '1; mode=block')
    response.header('Referrer-Policy', 'no-referrer')
    response.header(
      'Content-Security-Policy',
      "default-src 'self' 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw=' 'sha256-W+lIm8NzGKSAA+hPYBnTTi9FPX4RS+5f+vn77dO32ko=' 'sha256-pvukEGssf3w6u5+mxgVHnbiZCYAGJG7vMcjE29hkcKs='  https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'"
    )
    // COOP (Cross-Origin Opener Policy)
    response.header('Cross-Origin-Opener-Policy', sameOrigin)

    // COEP (Cross-Origin Embedder Policy)
    response.header('Cross-Origin-Embedder-Policy', 'require-corp')

    // CORP (Cross-Origin Resource Policy)
    response.header('Cross-Origin-Resource-Policy', sameOrigin)

    return h.continue
  } else {
    response.output.headers['Strict-Transport-Security'] =
      'max-age=63072000; includeSubDomains; preload'
    response.output.headers['X-Content-Type-Options'] = 'nosniff'
    response.output.headers['X-Frame-Options'] = 'DENY'
    response.output.headers['X-XSS-Protection'] = '1; mode=block'
    response.output.headers['Referrer-Policy'] = 'no-referrer'
    response.output.headers['Content-Security-Policy'] =
      "default-src 'self' 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw=' 'sha256-W+lIm8NzGKSAA+hPYBnTTi9FPX4RS+5f+vn77dO32ko=' 'sha256-pvukEGssf3w6u5+mxgVHnbiZCYAGJG7vMcjE29hkcKs='  https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'"
    response.output.header('Cross-Origin-Opener-Policy', sameOrigin)
    // COEP (Cross-Origin Embedder Policy)
    response.output.header('Cross-Origin-Embedder-Policy', 'require-corp')
    // CORP (Cross-Origin Resource Policy)
    response.output.header('Cross-Origin-Resource-Policy', sameOrigin)
  }

  request.logger.error(response)
  request.logger.error(response?.stack)
  // return  response.output
  return h.redirect(
    '/check-plant-health-information-and-import-rules/problem-with-service?statusCode=' +
      response.output.statusCode
  )
}

export { catchAll, setErrorMessage }
