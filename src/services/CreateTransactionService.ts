import AppError from '../errors/AppError';
import { getRepository, getCustomRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import TransactionRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';


interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;

}

class CreateTransactionService {
  public async execute({title, value, type, category}: Request): Promise<Transaction> {
    const categoryRepository = getRepository(Category);
    const transactionRepository = getCustomRepository(TransactionRepository);   
    const {total } = await transactionRepository.getBalance();
   
    if(value > total && type === 'outcome'){
      throw new AppError('Invalid account balance');
    }

    const checkCategory = await categoryRepository.findOne({
      where: {title: category}
    });

    if(!checkCategory){

      const newCategory = categoryRepository.create({
        title: category ,
      })
      
      await categoryRepository.save(newCategory);
      const idCategory = newCategory.id;
      const transaction = transactionRepository.create({
      title,
      value,
      type,
      category_id: idCategory,
      });
      await transactionRepository.save(transaction);
      return transaction;

    }

    const idCategory = checkCategory.id;
    const transaction = transactionRepository.create({
    title,
    value,
    type,
    category_id: idCategory,
    });
    await transactionRepository.save(transaction);
    return transaction;
    
  }
}

export default CreateTransactionService;
