export default class PaginationInfo
{ 
    constructor(){
        this.allpage = 0
        this.pageno = {type: Number,required: true} 
        this.pagelimit = {type: Number,required: true}
        this.filter = {type: Array}
        this.sort = {type: Array}
    }

    
    setPage(page){
        this.page = page
    }   
    setLimit(limit){
        this.limit = limit
    }
    setFilter(filter){
        this.filter = filter
    }
    setSort(sort){
        this.sort = sort
    }
    

    getPage(){
        return this.page 
    }
    getLimit(){
        return this.limit 
    }
    getFilter(){
        return this.filter 
    }
    getSort(){
        return this.sort
    }
}