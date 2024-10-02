class BDD {
    static instance = null;

    uploadSuccessful = false;

    constructor() {
        if (!(this.instance instanceof BDD)) {
            this.instance = new BDD();
        }

        BDD.instance = this;
    }
}