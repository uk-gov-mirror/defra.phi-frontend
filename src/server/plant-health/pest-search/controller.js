import { getDefaultLocaleData } from '~/src/server/localisation'
import { config } from '~/src/config'
import { setErrorMessage } from '~/src/server/common/helpers/errors'
import { proxyFetch } from '~/src/server/common/helpers/proxy-fetch'
const axios = require('axios')
const pestSearchController = {
  handler: async (request, h) => {
    if (request != null) {
      let page = ''
      let cslGlobal = ''
      let invalidPestSearchEntry = false
      if (request.query?.cslRef?.length > 0) {
        request.yar.set('cslRef', {
          value: parseInt(request.query.cslRef)
        })
      } else {
        if (
          request.query?.cslReff?.length > 0 &&
          request.query?.cslReff !== 'null'
        ) {
          request.yar.set('cslRef', {
            value: parseInt(request.query.cslReff)
          })
        }
      }
      if (decodeURI(request.query.pestsearchQuery) === 'No results found') {
        request.yar.set('pestsearchQuery', {
          value: ''
        })
      } else {
        request.yar.set('pestsearchQuery', {
          value: decodeURI(
            request.query.pestsearchQuery?.replace(/ *\([^)]*\) */g, '')
          )
        })
      }

      request.yar.set('eppoCode', {
        value: request.query.eppoCode
      })

      const data = await getDefaultLocaleData('pest-details')
      const mainContent = data?.mainContent
      request.yar.set('errors', '')
      request.yar.set('errorMessage', '')

      const pestsearchQuery = request?.yar?.get('pestsearchQuery')

      const getHelpSection = data?.getHelpSection

      if (!request.query.getcsl) {
        if (decodeURI(request.query.pestsearchQuery) !== 'No results found') {
          request.yar.set('pestFullSearchQuery', {
            value: decodeURI(request.query.pestsearchQuery)
          })
        }
        page = 'pestsearch'
        const cslRef = request.yar.get('cslRef')?.value
        cslGlobal = cslRef
      } else {
        page = 'plantdetails'
        cslGlobal = parseInt(request.query?.getcsl)
      }

      let pestDetails

      if (
        cslGlobal &&
        pestsearchQuery?.value &&
        pestsearchQuery?.value !== ''
      ) {
        pestDetails = {
          cslRef: parseInt(cslGlobal)
        }
        const result = await invokepestdetailsAPI(pestDetails)
        async function invokepestdetailsAPI(payload) {
          try {
            const response = await axios.post(
              config.get('backendApiUrl') + '/search/pestdetails',
              { pestDetails: payload }
            )

            return response.data
          } catch (error) {
            const errorDetails = {
              message: error.message,
              cause: error.cause,
              code: error.code,
              status: error.response?.status,
              statusText: error.response?.statusText,
              url: config.get('backendApiUrl') + '/search/pestdetails'
            }

            process.stderr('Pest details error:', errorDetails)
            process.stdout('Pest details error:', errorDetails)

            return error // Rethrow the error so it can be handled appropriately
          }
        }

        const plantLinkMap = new Map()

        let resultofPhoto
        const Annex3URL = config.get('Annex3')
        const ContactAuthURL = config.get('contactAuthorities')
        const eppoCode = result.pest_detail[0].EPPO_CODE

        const photoURL = config.get('photoURL') + eppoCode + '/photos'

        const proxyVar = await proxyFetch(photoURL, null)
        const proxyVarstatus = proxyVar.status

        const photores = await getstatus(proxyVarstatus)

        async function getstatus(proxyVarstatus) {
          const status = Number(proxyVarstatus)
          // Evaluate the response
          if (status === 200) {
            return true
          } else {
            return false
          }
        }

        function parseDate(dateString) {
          const parts = dateString.split('/')
          let day, month, year
          const format = config.get('dateFormat')

          if (format === 'dd/mm/yyyy') {
            day = parseInt(parts[0], 10)
            month = parseInt(parts[1], 10) - 1 // Months are zero-indexed
            year = parseInt(parts[2], 10)

            // Add more format conditions if needed
            const cdate = new Date(year, month, day)

            const monthn = cdate.toLocaleString('default', { month: 'long' })
            const datef = monthn + ' ' + cdate.getFullYear()
            if (datef === 'Invalid Date NaN' || datef === ' ') {
              return 'No date available'
            } else {
              return datef
            }
          } else {
            return 'No date available'
          }
        }

        const factsheetlinks = []
        const otherPublications = []
        const Rnpmap = []
        const Othermap = []
        // let publicationDateFormated;
        const fc = 'factsheet'.toUpperCase()
        const commanNamearray = result.pest_detail[0].PEST_NAME[1].NAME
        const commonNameSorted = commanNamearray.sort()

        const syNamearray = result.pest_detail[0].PEST_NAME[2].NAME
        const SynonymNameSorted = syNamearray.sort()

        for (let i = 0; i < result.pest_detail[0].DOCUMENT_LINK.length; i++) {
          if (
            result.pest_detail[0].DOCUMENT_LINK[i].VISIBLE_ON_PHI_INDICATOR ===
            1
          ) {
            if (
              result.pest_detail[0].DOCUMENT_LINK[
                i
              ].DOCUMENT_TYPE.toUpperCase() === fc
            ) {
              const convertedDate = parseDate(
                result.pest_detail[0].DOCUMENT_LINK[i].PUBLICATION_DATE
              )

              const fcl = result.pest_detail[0].DOCUMENT_LINK[i]
              fcl.PUBLICATION_DATE_FORMATTED = convertedDate
              fcl.TITLE =
                result.pest_detail[0].DOCUMENT_LINK[i].DOCUMENT_TITLE.split('.')

              if (
                result.pest_detail[0].DOCUMENT_LINK[i].DOCUMENT_TITLE !== ''
              ) {
                const lastIndex =
                  result.pest_detail[0].DOCUMENT_LINK[
                    i
                  ].DOCUMENT_TITLE.lastIndexOf('.')

                const s1 = result.pest_detail[0].DOCUMENT_LINK[
                  i
                ].DOCUMENT_TITLE.substring(0, lastIndex)
                fcl.TITLE = s1
              } else {
                fcl.TITLE = ' '
              }
              let docFormat
              if (
                result.pest_detail[0].DOCUMENT_LINK[i].DOCUMENT_FORMAT !== ''
              ) {
                docFormat =
                  result.pest_detail[0].DOCUMENT_LINK[i].DOCUMENT_FORMAT.split(
                    '/'
                  )
              } else {
                docFormat = ''
              }

              fcl.FILE_EXTENSION = docFormat[1].toUpperCase()
              const st = fcl.PUBLICATION_DATE_FORMATTED.split(' ')
              fcl.INDEX = Number(st[1])
              factsheetlinks.push(fcl)
            } else {
              const ocl = result.pest_detail[0].DOCUMENT_LINK[i]

              // const res1 = getPublicationDate(
              //   result.pest_detail[0].DOCUMENT_LINK[i].PUBLICATION_DATE
              // )
              const convertedDate1 = parseDate(
                result.pest_detail[0].DOCUMENT_LINK[i].PUBLICATION_DATE
              )
              ocl.PUBLICATION_DATE_FORMATTED = convertedDate1
              if (
                result.pest_detail[0].DOCUMENT_LINK[i].DOCUMENT_TITLE !== ''
              ) {
                const lastIndexp =
                  result.pest_detail[0].DOCUMENT_LINK[
                    i
                  ].DOCUMENT_TITLE.lastIndexOf('.')

                const s2 = result.pest_detail[0].DOCUMENT_LINK[
                  i
                ].DOCUMENT_TITLE.substring(0, lastIndexp)
                ocl.TITLE = s2
              } else {
                ocl.TITLE = ' '
              }
              let docFormat1
              if (
                result.pest_detail[0].DOCUMENT_LINK[i].DOCUMENT_FORMAT !== ''
              ) {
                docFormat1 =
                  result.pest_detail[0].DOCUMENT_LINK[i].DOCUMENT_FORMAT.split(
                    '/'
                  )
              } else {
                docFormat1 = ''
              }

              ocl.FILE_EXTENSION = docFormat1[1].toUpperCase()
              const st = ocl.PUBLICATION_DATE_FORMATTED.split(' ')
              ocl.INDEX = Number(st[1])
              otherPublications.push(ocl)
            }
          }
        }
        // Sorting documents based on new one first
        factsheetlinks.sort(function (a, b) {
          return b.INDEX - a.INDEX
        })
        otherPublications.sort(function (a, b) {
          return b.INDEX - a.INDEX
        })

        const plantLinl = []
        for (let a = 0; a < result.pest_detail[0].PLANT_LINK.length; a++) {
          if (result.pest_detail[0].QUARANTINE_INDICATOR === 'R') {
            plantLinl.push(result.pest_detail[0].PLANT_LINK[a].HOST_REF)
          }
          const item = result.pest_detail[0].PLANT_LINK[a].PLANT_NAME
          const commonmNames = []
          for (let j = 0; j < item.length; j++) {
            if (item[j].type === 'COMMON_NAME') {
              commonmNames.push(item[j].NAME)
            }
          }

          plantLinkMap.set(
            result.pest_detail[0].PLANT_LINK[a].LATIN_NAME,
            commonmNames
          )
        }

        if (result.pest_detail[0].QUARANTINE_INDICATOR === 'R') {
          const Plantdetails = await invokepestplantLinkAPI(plantLinl)

          const array1 = Plantdetails.pest_link

          const RArray = []
          const OtherArray = []
          const Rmap = new Map()
          const Omap = new Map()
          for (let ar = 0; ar < array1.length; ar++) {
            for (let r = 0; r < array1[ar].PEST_LINK.length; r++) {
              if (
                array1[ar].PEST_LINK[r].CSL_REF ===
                result.pest_detail[0].CSL_REF
              ) {
                if (array1[ar].PEST_LINK[r].QUARANTINE_INDICATOR === 'R') {
                  const ra = []
                  ra.HOSTREF = array1[ar].HOST_REF
                  ra.FORMAT = array1[ar].PEST_LINK[r].REGULATION_INDICATOR
                  RArray.push(ra.HOSTREF)
                  Rmap.set(ra.HOSTREF, ra.FORMAT)
                } else {
                  const ra = []
                  ra.HOSTREF = array1[ar].HOST_REF
                  ra.FORMAT = array1[ar].PEST_LINK[r].REGULATION_INDICATOR
                  OtherArray.push(ra.HOSTREF)
                  Omap.set(ra.HOSTREF, ra.FORMAT)
                }
              }
            }
          }

          for (let a = 0; a < result.pest_detail[0].PLANT_LINK.length; a++) {
            if (result.pest_detail[0].QUARANTINE_INDICATOR === 'R') {
              // RArray = RArray.map(Number)

              RArray.forEach((element) => {
                if (element === result.pest_detail[0].PLANT_LINK[a].HOST_REF) {
                  const item = result.pest_detail[0].PLANT_LINK[a].PLANT_NAME

                  const commonmNames = []
                  for (let j = 0; j < item.length; j++) {
                    if (item[j].type === 'COMMON_NAME') {
                      commonmNames.push(item[j].NAME)
                    }
                  }
                  const va = []
                  va.LATIN_NAME = result.pest_detail[0].PLANT_LINK[a].LATIN_NAME
                  va.COMMAN_NAME = commonmNames
                  va.FORMAT = Rmap.get(
                    result.pest_detail[0].PLANT_LINK[a].HOST_REF
                  )
                  Rnpmap.push(va)
                }
              })

              OtherArray.forEach((element) => {
                if (element === result.pest_detail[0].PLANT_LINK[a].HOST_REF) {
                  const item = result.pest_detail[0].PLANT_LINK[a].PLANT_NAME

                  const commonmNames = []
                  for (let j = 0; j < item.length; j++) {
                    if (item[j].type === 'COMMON_NAME') {
                      commonmNames.push(item[j].NAME)
                    }
                  }
                  const va = []
                  va.LATIN_NAME = result.pest_detail[0].PLANT_LINK[a].LATIN_NAME
                  va.COMMAN_NAME = commonmNames
                  va.FORMAT = Rmap.get(
                    result.pest_detail[0].PLANT_LINK[a].HOST_REF
                  )
                  Othermap.push(va)
                }
              })
            }
          }
        } else {
          Rnpmap.push()
          Othermap.push()
        }

        async function invokepestplantLinkAPI(payload) {
          try {
            const response = await axios.post(
              config.get('backendApiUrl') + '/search/pestlink',
              { hostRefs: payload }
            )

            return response.data
          } catch (error) {
            return error // Rethrow the error so it can be handled appropriately
          }
        }
        request.yar.set('searchQuery', {
          value: decodeURI(request.yar?.get('searchQuery')?.value)
        })
        request.yar.set('fullSearchQuery', {
          value: decodeURI(request.yar?.get('fullSearchQuery')?.value)
        })
        request.yar.set('countrySearchQuery', {
          value: decodeURI(request.yar?.get('countrySearchQuery')?.value)
        })
        request.yar.set('format', {
          value: decodeURI(request.yar?.get('format')?.value)
        })
        request.yar.set('hostRef', {
          value: decodeURI(request.yar?.get('hostRef')?.value)
        })
        const searchQuery = request.yar?.get('searchQuery')?.value
        const fullSearchQuery = request.yar?.get('fullSearchQuery')?.value
        const countrySearchQuery = request.yar?.get('countrySearchQuery')?.value
        const hostRef = request.yar?.get('hostRef')?.value
        const format = request.yar?.get('format')?.value
        const plantLinkMapsorted = new Map([...plantLinkMap.entries()].sort())
        const pestFullSearchQuery = request.yar.get('pestFullSearchQuery')
        if (cslGlobal) {
          return h.view('plant-health/pest-details/index', {
            pageTitle:
              result.pest_detail[0].PEST_NAME[0].NAME +
              ' — Check plant health information and import rules — GOV.UK',
            heading: 'Pestdetails',
            getHelpSection,
            mainContent,
            cslRef: cslGlobal,
            eppoCode,
            pestFullSearchQuery,
            resultofPhoto,
            photoURL,
            photores,
            format,
            Annex3URL,
            searchQuery,
            fullSearchQuery,
            hostRef,
            countrySearchQuery,
            pestsearchQuery,
            ContactAuthURL,
            quarantineIndicator: result.pest_detail[0].QUARANTINE_INDICATOR,
            preferredName: result.pest_detail[0].PEST_NAME[0].NAME,
            commonNames: commonNameSorted,
            synonymNames: SynonymNameSorted,
            plantLinkMapsorted,
            otherPublications,
            factsheetlinks,
            Rnpmap,
            page,
            Othermap
          })
        }
      } else {
        const pestsearchQuery = request?.yar?.get('pestsearchQuery')
        if (!pestsearchQuery?.value) {
          const errorData = await getDefaultLocaleData('pest-search')
          const errorSection = errorData?.errors
          setErrorMessage(
            request,
            errorSection?.titleText,
            errorSection?.searchErrorListText
          )
        } else if (pestsearchQuery?.value) {
          invalidPestSearchEntry = true
        }

        const errors = request.yar?.get('errors')
        const errorMessage = request.yar?.get('errorMessage')
        let pageTitle
        if (errors?.list?.errorList?.length > 0) {
          pageTitle =
            'Error: What pest or disease do you want to find out about? — Check plant health information and import rules — GOV.UK'
        } else if (invalidPestSearchEntry) {
          pageTitle =
            'Search results for ' +
            pestsearchQuery.value +
            ' — Check plant health information and import rules — GOV.UK'
        } else {
          pageTitle =
            'What pest or disease do you want to find out about? — Check plant health information and import rules — GOV.UK'
        }

        return h.view('plant-health/pest-search/index.njk', {
          mainContent,
          getHelpSection,
          pestsearchQuery,
          invalidPestSearchEntry,
          pageTitle,
          heading: 'Search',
          errors,
          page,
          errorMessage
        })
      }
    }
  }
}

export { pestSearchController }
